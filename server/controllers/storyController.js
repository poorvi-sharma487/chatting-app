const Story = require('../models/Story');
const { uploadBase64ToCloudinary } = require('../utils/cloudinary');

// Create story
exports.createStory = async (req, res) => {
    try {
        const { mediaData, mediaType, caption } = req.body;

        let mediaUrl = '';
        if (mediaData) {
            const result = await uploadBase64ToCloudinary(mediaData, 'snapnova/stories');
            mediaUrl = result.secure_url;
        }

        if (!mediaUrl) {
            return res.status(400).json({ success: false, message: 'Media is required' });
        }

        const story = new Story({
            userId: req.userId,
            mediaUrl,
            mediaType: mediaType || 'image',
            caption: caption || '',
        });

        await story.save();
        res.status(201).json({ success: true, story });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get stories feed (friends' stories)
exports.getStoriesFeed = async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.userId);
        const friendIds = [...user.friends, req.userId];

        const stories = await Story.find({
            userId: { $in: friendIds },
            expiresAt: { $gt: new Date() },
        })
            .populate('userId', 'username avatar')
            .sort({ createdAt: -1 });

        // Group by user
        const grouped = {};
        stories.forEach((story) => {
            const uid = story.userId._id.toString();
            if (!grouped[uid]) {
                grouped[uid] = {
                    user: story.userId,
                    stories: [],
                };
            }
            grouped[uid].stories.push(story);
        });

        res.json({ success: true, storiesFeed: Object.values(grouped) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// View a story (add to viewers)
exports.viewStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) {
            return res.status(404).json({ success: false, message: 'Story not found' });
        }

        if (!story.viewers.includes(req.userId)) {
            story.viewers.push(req.userId);
            await story.save();
        }

        res.json({ success: true, story });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete story
exports.deleteStory = async (req, res) => {
    try {
        const story = await Story.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId,
        });
        if (!story) {
            return res.status(404).json({ success: false, message: 'Story not found' });
        }
        res.json({ success: true, message: 'Story deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get my stories
exports.getMyStories = async (req, res) => {
    try {
        const stories = await Story.find({
            userId: req.userId,
            expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 });
        res.json({ success: true, stories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
