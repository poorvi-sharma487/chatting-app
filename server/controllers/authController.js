const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

// Register
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save();

        res.status(201).json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio,
            },
            accessToken,
            refreshToken,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = refreshToken;
        user.isOnline = true;
        await user.save();

        res.json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio,
                friends: user.friends,
            },
            accessToken,
            refreshToken,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Refresh Token
exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh token required' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ success: false, message: 'Invalid refresh token' });
        }

        const newAccessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        user.refreshToken = newRefreshToken;
        await user.save();

        res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
        res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }
};

// Logout — best-effort, does not require valid auth
exports.logout = async (req, res) => {
    try {
        // Try to extract userId from Authorization header (best-effort, token may be expired)
        let userId = null;
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
                userId = decoded.userId;
            }
        } catch {
            // Token parsing failed — that's fine, we still return success
        }

        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                user.refreshToken = '';
                user.isOnline = false;
                user.lastSeen = new Date();
                await user.save();
            }
        }

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        // Always return success for logout — client just needs to clear its state
        res.json({ success: true, message: 'Logged out' });
    }
};

// Get current user
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select('-password -refreshToken')
            .populate('friends', 'username avatar isOnline lastSeen');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
