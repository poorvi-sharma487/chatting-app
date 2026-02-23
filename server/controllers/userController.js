const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadBase64ToCloudinary } = require('../utils/cloudinary');

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id || req.userId)
            .select('-password -refreshToken')
            .populate('friends', 'username avatar isOnline lastSeen')
            .populate('friendRequests.from', 'username avatar');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { bio, avatar } = req.body;
        const updateData = {};

        if (bio !== undefined) updateData.bio = bio;

        if (avatar && avatar.startsWith('data:')) {
            const result = await uploadBase64ToCloudinary(avatar, 'snapnova/avatars');
            updateData.avatar = result.secure_url;
        }

        const user = await User.findByIdAndUpdate(req.userId, updateData, { new: true })
            .select('-password -refreshToken');
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Search users
exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json({ success: true, users: [] });
        }
        const users = await User.find({
            $and: [
                { _id: { $ne: req.userId } },
                {
                    $or: [
                        { username: { $regex: q, $options: 'i' } },
                        { email: { $regex: q, $options: 'i' } },
                    ]
                },
            ],
        }).select('username avatar bio isOnline').limit(20);

        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Send friend request
exports.sendFriendRequest = async (req, res) => {
    try {
        const { userId } = req.body;
        if (userId === req.userId) {
            return res.status(400).json({ success: false, message: 'Cannot send request to yourself' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const currentUser = await User.findById(req.userId);

        if (currentUser.friends.includes(userId)) {
            return res.status(400).json({ success: false, message: 'Already friends' });
        }

        const alreadyRequested = targetUser.friendRequests.some(
            (r) => r.from.toString() === req.userId
        );
        if (alreadyRequested) {
            return res.status(400).json({ success: false, message: 'Request already sent' });
        }

        targetUser.friendRequests.push({ from: req.userId });
        await targetUser.save();

        // Create notification
        await Notification.create({
            userId: targetUser._id,
            type: 'friend_request',
            fromUserId: req.userId,
            message: `${currentUser.username} sent you a friend request`,
        });

        // Real-time notification
        const io = req.app.get('io');
        io.to(userId).emit('notification', {
            type: 'friend_request',
            from: { _id: currentUser._id, username: currentUser.username, avatar: currentUser.avatar },
            message: `${currentUser.username} sent you a friend request`,
        });

        res.json({ success: true, message: 'Friend request sent' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Accept friend request
exports.acceptFriendRequest = async (req, res) => {
    try {
        const { userId } = req.body;
        const currentUser = await User.findById(req.userId);
        const otherUser = await User.findById(userId);

        if (!otherUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const requestIndex = currentUser.friendRequests.findIndex(
            (r) => r.from.toString() === userId
        );
        if (requestIndex === -1) {
            return res.status(400).json({ success: false, message: 'No friend request found' });
        }

        currentUser.friendRequests.splice(requestIndex, 1);
        currentUser.friends.push(userId);
        otherUser.friends.push(req.userId);

        await currentUser.save();
        await otherUser.save();

        const io = req.app.get('io');
        io.to(userId).emit('notification', {
            type: 'friend_request',
            message: `${currentUser.username} accepted your friend request`,
        });

        res.json({ success: true, message: 'Friend request accepted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Reject friend request
exports.rejectFriendRequest = async (req, res) => {
    try {
        const { userId } = req.body;
        const currentUser = await User.findById(req.userId);

        const requestIndex = currentUser.friendRequests.findIndex(
            (r) => r.from.toString() === userId
        );
        if (requestIndex === -1) {
            return res.status(400).json({ success: false, message: 'No friend request found' });
        }

        currentUser.friendRequests.splice(requestIndex, 1);
        await currentUser.save();

        res.json({ success: true, message: 'Friend request rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Remove friend
exports.removeFriend = async (req, res) => {
    try {
        const { userId } = req.body;
        await User.findByIdAndUpdate(req.userId, { $pull: { friends: userId } });
        await User.findByIdAndUpdate(userId, { $pull: { friends: req.userId } });
        res.json({ success: true, message: 'Friend removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get suggested friends
exports.getSuggested = async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        const users = await User.find({
            _id: { $nin: [...currentUser.friends, req.userId] },
        })
            .select('username avatar bio isOnline')
            .limit(10);

        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get notifications
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.userId })
            .populate('fromUserId', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark notifications read
exports.markNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.userId, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
