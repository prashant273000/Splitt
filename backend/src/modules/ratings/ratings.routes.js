const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { ratingCreateLimiter } = require('../../middleware/rate-limit');
const { createRatingSchema } = require('./ratings.schema');
const { createRating } = require('./ratings.service');

const router = express.Router();

router.post('/', requireAuth, ratingCreateLimiter, async (req, res, next) => {
  try {
    const result = createRatingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    }
    const rating = await createRating(result.data, req.user.id);
    res.status(201).json(rating);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
