const Message = require('../models/Message');
const { uploadBase64ToCloudinary } = require('../utils/cloudinary');

// Upload snap
exports.uploadSnap = async (req, res) => {
    try {
        const { receiverId, mediaData, mediaType, snapDuration } = req.body;

        let mediaUrl = '';
        if (mediaData) {
            const result = await uploadBase64ToCloudinary(mediaData, 'snapnova/snaps');
            mediaUrl = result.secure_url;
        }

        if (!mediaUrl) {
            return res.status(400).json({ success: false, message: 'Media is required for snap' });
        }

        const snap = new Message({
            senderId: req.userId,
            receiverId,
            mediaUrl,
            mediaType: mediaType || 'image',
            isSnap: true,
            snapDuration: snapDuration || 5,
        });

        await snap.save();

        const io = req.app.get('io');
        io.to(receiverId).emit('receiveMessage', snap);
        io.to(receiverId).emit('notification', {
            type: 'snap',
            message: 'You received a new snap!',
        });

        res.status(201).json({ success: true, snap });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get snap
exports.getSnap = async (req, res) => {
    try {
        const snap = await Message.findById(req.params.id);
        if (!snap || !snap.isSnap) {
            return res.status(404).json({ success: false, message: 'Snap not found' });
        }

        // Set expiry when viewed
        if (!snap.expiresAt && snap.receiverId.toString() === req.userId) {
            snap.expiresAt = new Date(Date.now() + (snap.snapDuration * 1000));
            snap.isSeen = true;
            await snap.save();
        }

        res.json({ success: true, snap });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete snap
exports.deleteSnap = async (req, res) => {
    try {
        await Message.findOneAndDelete({ _id: req.params.id, isSnap: true });
        res.json({ success: true, message: 'Snap deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
