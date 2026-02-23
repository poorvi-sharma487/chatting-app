const router = require('express').Router();
const auth = require('../middlewares/auth');
const {
    getMessages,
    sendMessage,
    markSeen,
    deleteMessage,
    getConversations,
} = require('../controllers/messageController');

router.get('/conversations', auth, getConversations);
router.get('/:userId', auth, getMessages);
router.post('/', auth, sendMessage);
router.put('/seen', auth, markSeen);
router.delete('/:id', auth, deleteMessage);

module.exports = router;
