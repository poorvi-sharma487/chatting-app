const router = require('express').Router();
const auth = require('../middlewares/auth');
const {
    sendRequest,
    getRequests,
    acceptRequest,
    rejectRequest,
} = require('../controllers/contactController');

router.post('/request', auth, sendRequest);
router.get('/requests', auth, getRequests);
router.post('/accept', auth, acceptRequest);
router.post('/reject', auth, rejectRequest);

module.exports = router;
