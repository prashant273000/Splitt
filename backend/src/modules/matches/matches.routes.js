const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { getMatchesForUser, confirmMatch, rejectMatch } = require('./matches.service');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const matches = await getMatchesForUser(req.user.id);
    res.json(matches);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const match = await confirmMatch(req.params.id, req.user.id);
    res.json(match);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await rejectMatch(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
