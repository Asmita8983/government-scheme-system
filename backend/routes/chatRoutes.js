const express = require('express');
const router = express.Router();
const { handleChatTurn } = require('../controllers/chatController');

router.post('/', handleChatTurn);

module.exports = router;
