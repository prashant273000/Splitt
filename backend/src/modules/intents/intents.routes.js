const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { intentCreateLimiter } = require('../../middleware/rate-limit');
const { createIntentSchema } = require('./intents.schema');
const { createIntent, getIntentsForUser, cancelIntent } = require('./intents.service');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const intents = await getIntentsForUser(req.user.id);
    res.json(intents);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, intentCreateLimiter, async (req, res, next) => {
  try {
    const result = createIntentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    }
    const intent = await createIntent(result.data, req.user.id);
    res.status(201).json(intent);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await cancelIntent(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
