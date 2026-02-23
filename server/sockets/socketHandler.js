const mongoose = require('mongoose');
const User = require('../models/User');

// Track online users: { socketId: userId, ... } and { userId: socketId, ... }
const onlineUsers = new Map();

const setupSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`⚡ Socket connected: ${socket.id}`);

        // User comes online
        socket.on('userOnline', async (userId) => {
            if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                console.log(`⚠️ Invalid userId received for userOnline: ${userId}`);
                return;
            }
            onlineUsers.set(socket.id, userId);
            socket.join(userId); // Join personal room for targeted messages

            try {
                await User.findByIdAndUpdate(userId, { isOnline: true });
            } catch (err) {
                console.error('Error updating online status:', err);
            }

            // Broadcast online status to all
            io.emit('userStatusChange', { userId, isOnline: true });
        });

        // Send message
        socket.on('sendMessage', (data) => {
            const { receiverId } = data;
            io.to(receiverId).emit('receiveMessage', data);
        });

        // Typing indicator
        socket.on('typing', ({ senderId, receiverId, isTyping }) => {
            io.to(receiverId).emit('typing', { senderId, isTyping });
        });

        // Seen message
        socket.on('seenMessage', ({ senderId, seenBy }) => {
            io.to(senderId).emit('seenMessage', { by: seenBy });
        });

        // Generic notification
        socket.on('notification', (data) => {
            const { targetUserId } = data;
            io.to(targetUserId).emit('notification', data);
        });

        // Disconnect
        socket.on('disconnect', async () => {
            const userId = onlineUsers.get(socket.id);
            if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                onlineUsers.delete(socket.id);

                try {
                    await User.findByIdAndUpdate(userId, {
                        isOnline: false,
                        lastSeen: new Date(),
                    });
                } catch (err) {
                    console.error('Error updating offline status:', err);
                }

                io.emit('userStatusChange', { userId, isOnline: false });
            }
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });
};

module.exports = { setupSocket, onlineUsers };
