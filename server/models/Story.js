const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    mediaUrl: {
        type: String,
        required: true,
    },
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        default: 'image',
    },
    caption: {
        type: String,
        default: '',
        maxlength: 200,
    },
    viewers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
}, { timestamps: true });

// TTL index for auto-deleting stories after 24 hours
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', storySchema);
