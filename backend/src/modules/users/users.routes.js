const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { getUserById } = require('./users.service');

const router = express.Router();

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
