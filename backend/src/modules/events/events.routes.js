const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { sseManager } = require('../../lib/sse-manager');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  sseManager.add(req.user.id, res);
});

module.exports = router;
