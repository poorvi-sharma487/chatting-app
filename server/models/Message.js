const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    text: {
        type: String,
        default: '',
    },
    mediaUrl: {
        type: String,
        default: '',
    },
    mediaType: {
        type: String,
        enum: ['image', 'video', 'text'],
        default: 'text',
    },
    isSeen: {
        type: Boolean,
        default: false,
    },
    isSnap: {
        type: Boolean,
        default: false,
    },
    snapDuration: {
        type: Number,
        default: 5,
    },
    expiresAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

// TTL index for auto-deleting expired messages
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);
