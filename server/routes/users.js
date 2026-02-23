const router = require('express').Router();
const auth = require('../middlewares/auth');
const {
    getProfile,
    updateProfile,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getSuggested,
    getNotifications,
    markNotificationsRead,
} = require('../controllers/userController');

router.get('/profile/:id?', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.get('/search', auth, searchUsers);
router.post('/friend-request', auth, sendFriendRequest);
router.post('/accept-friend', auth, acceptFriendRequest);
router.post('/reject-friend', auth, rejectFriendRequest);
router.post('/remove-friend', auth, removeFriend);
router.get('/suggested', auth, getSuggested);
router.get('/notifications', auth, getNotifications);
router.put('/notifications/read', auth, markNotificationsRead);

module.exports = router;
