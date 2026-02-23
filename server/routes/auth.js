const router = require('express').Router();
const { register, login, refresh, logout, getMe } = require('../controllers/authController');
const auth = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', auth, getMe);

module.exports = router;
