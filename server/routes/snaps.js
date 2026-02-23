const router = require('express').Router();
const auth = require('../middlewares/auth');
const { uploadSnap, getSnap, deleteSnap } = require('../controllers/snapController');

router.post('/upload', auth, uploadSnap);
router.get('/:id', auth, getSnap);
router.delete('/:id', auth, deleteSnap);

module.exports = router;
