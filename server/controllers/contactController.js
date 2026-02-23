const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

// POST /api/contacts/request — Send a contact request
exports.sendRequest = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required' });
        }

        if (userId === req.userId) {
            return res.status(400).json({ success: false, message: 'Cannot send request to yourself' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const currentUser = await User.findById(req.userId);

        // Check if already friends
        if (currentUser.friends.includes(userId)) {
            return res.status(400).json({ success: false, message: 'Already friends' });
        }

        // Check for existing pending request in either direction
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { senderId: req.userId, receiverId: userId, status: 'pending' },
                { senderId: userId, receiverId: req.userId, status: 'pending' },
            ],
        });

        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'A pending request already exists' });
        }

        // Check for previously rejected request and allow re-sending
        const rejectedRequest = await FriendRequest.findOne({
            senderId: req.userId,
            receiverId: userId,
            status: 'rejected',
        });

        if (rejectedRequest) {
            rejectedRequest.status = 'pending';
            await rejectedRequest.save();
        } else {
            await FriendRequest.create({
                senderId: req.userId,
                receiverId: userId,
            });
        }

        // Create notification
        await Notification.create({
            userId: targetUser._id,
            type: 'friend_request',
            fromUserId: req.userId,
            message: `${currentUser.username} sent you a contact request`,
        });

        // Real-time notification via socket
        const io = req.app.get('io');
        io.to(userId).emit('notification', {
            type: 'friend_request',
            from: { _id: currentUser._id, username: currentUser.username, avatar: currentUser.avatar },
            message: `${currentUser.username} sent you a contact request`,
        });

        res.json({ success: true, message: 'Contact request sent' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Request already exists' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/contacts/requests — Get incoming + sent pending requests
exports.getRequests = async (req, res) => {
    try {
        const incoming = await FriendRequest.find({
            receiverId: req.userId,
            status: 'pending',
        }).populate('senderId', 'username avatar bio isOnline').sort({ createdAt: -1 });

        const sent = await FriendRequest.find({
            senderId: req.userId,
            status: 'pending',
        }).populate('receiverId', 'username avatar bio isOnline').sort({ createdAt: -1 });

        res.json({
            success: true,
            incoming: incoming.map((r) => ({
                _id: r._id,
                user: r.senderId,
                status: r.status,
                createdAt: r.createdAt,
            })),
            sent: sent.map((r) => ({
                _id: r._id,
                user: r.receiverId,
                status: r.status,
                createdAt: r.createdAt,
            })),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/contacts/accept — Accept a contact request
exports.acceptRequest = async (req, res) => {
    try {
        const { requestId } = req.body;

        if (!requestId) {
            return res.status(400).json({ success: false, message: 'requestId is required' });
        }

        const request = await FriendRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.receiverId.toString() !== req.userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to accept this request' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request is no longer pending' });
        }

        // Update request status
        request.status = 'accepted';
        await request.save();

        // Add each user to the other's friends list (if not already there)
        const currentUser = await User.findById(req.userId);
        const otherUser = await User.findById(request.senderId);

        if (!currentUser.friends.includes(request.senderId)) {
            currentUser.friends.push(request.senderId);
            await currentUser.save();
        }

        if (!otherUser.friends.includes(req.userId)) {
            otherUser.friends.push(req.userId);
            await otherUser.save();
        }

        // Also remove from legacy friendRequests array if present
        await User.findByIdAndUpdate(req.userId, {
            $pull: { friendRequests: { from: request.senderId } },
        });

        // Create a welcome message to start the conversation
        await Message.create({
            senderId: request.senderId,
            receiverId: req.userId,
            text: `👋 Hey! We're now connected on Snapnova!`,
            mediaType: 'text',
        });

        // Notify the sender
        const io = req.app.get('io');
        io.to(request.senderId.toString()).emit('notification', {
            type: 'friend_request',
            message: `${currentUser.username} accepted your contact request`,
        });

        await Notification.create({
            userId: request.senderId,
            type: 'friend_request',
            fromUserId: req.userId,
            message: `${currentUser.username} accepted your contact request`,
        });

        res.json({ success: true, message: 'Contact request accepted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/contacts/reject — Reject a contact request
exports.rejectRequest = async (req, res) => {
    try {
        const { requestId } = req.body;

        if (!requestId) {
            return res.status(400).json({ success: false, message: 'requestId is required' });
        }

        const request = await FriendRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.receiverId.toString() !== req.userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to reject this request' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request is no longer pending' });
        }

        request.status = 'rejected';
        await request.save();

        // Also remove from legacy friendRequests array if present
        await User.findByIdAndUpdate(req.userId, {
            $pull: { friendRequests: { from: request.senderId } },
        });

        res.json({ success: true, message: 'Contact request rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
