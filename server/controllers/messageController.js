const mongoose = require('mongoose');
const Message = require('../models/Message');
const { uploadBase64ToCloudinary } = require('../utils/cloudinary');

// Get messages between two users
exports.getMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        const messages = await Message.find({
            $or: [
                { senderId: req.userId, receiverId: userId },
                { senderId: userId, receiverId: req.userId },
            ],
        }).sort({ createdAt: 1 }).limit(100);

        res.json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, text, mediaData, mediaType, isSnap, snapDuration } = req.body;

        let mediaUrl = '';
        if (mediaData) {
            const result = await uploadBase64ToCloudinary(mediaData, 'snapnova/messages');
            mediaUrl = result.secure_url;
        }

        const message = new Message({
            senderId: req.userId,
            receiverId,
            text: text || '',
            mediaUrl,
            mediaType: mediaUrl ? (mediaType || 'image') : 'text',
            isSnap: isSnap || false,
            snapDuration: snapDuration || 5,
        });

        await message.save();

        // Emit via socket
        const io = req.app.get('io');
        io.to(receiverId).emit('receiveMessage', message);

        res.status(201).json({ success: true, message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark messages as seen
exports.markSeen = async (req, res) => {
    try {
        const { senderId } = req.body;
        await Message.updateMany(
            { senderId, receiverId: req.userId, isSeen: false },
            { isSeen: true }
        );

        const io = req.app.get('io');
        io.to(senderId).emit('seenMessage', { by: req.userId });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete message (snap viewed)
exports.deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get conversations list
exports.getConversations = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.userId)) {
            return res.status(400).json({ success: false, message: 'Invalid User ID' });
        }

        const userObjectId = new mongoose.Types.ObjectId(req.userId);

        const messages = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: userObjectId },
                        { receiverId: userObjectId },
                    ],
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$senderId', userObjectId] },
                            '$receiverId',
                            '$senderId',
                        ],
                    },
                    lastMessage: { $first: '$$ROOT' },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    user: { _id: 1, username: 1, avatar: 1, isOnline: 1, lastSeen: 1 },
                    lastMessage: 1,
                },
            },
            { $sort: { 'lastMessage.createdAt': -1 } },
        ]);

        res.json({ success: true, conversations: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
