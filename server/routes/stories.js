const router = require('express').Router();
const auth = require('../middlewares/auth');
const {
    createStory,
    getStoriesFeed,
    viewStory,
    deleteStory,
    getMyStories,
} = require('../controllers/storyController');

router.post('/', auth, createStory);
router.get('/feed', auth, getStoriesFeed);
router.get('/mine', auth, getMyStories);
router.put('/:id/view', auth, viewStory);
router.delete('/:id', auth, deleteStory);

module.exports = router;
