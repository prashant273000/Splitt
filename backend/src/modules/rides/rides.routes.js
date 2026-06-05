const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { rideCreateLimiter } = require('../../middleware/rate-limit');
const { createRideSchema } = require('./rides.schema');
const { createRide, getRideById, cancelRide, joinRide, leaveRide, getMyActiveRides } = require('./rides.service');

const router = express.Router();

router.post('/', requireAuth, rideCreateLimiter, async (req, res, next) => {
  try {
    const result = createRideSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.errors });
    }
    const ride = await createRide(result.data, req.user.id);
    res.status(201).json(ride);
  } catch (err) {
    next(err);
  }
});

// /mine must be registered before /:id or Express matches 'mine' as the id param.
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const rides = await getMyActiveRides(req.user.id);
    res.json(rides);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const ride = await getRideById(req.params.id, req.user.id);
    res.json(ride);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await cancelRide(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', requireAuth, async (req, res, next) => {
  try {
    const ride = await joinRide(req.params.id, req.user.id);
    res.json(ride);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/leave', requireAuth, async (req, res, next) => {
  try {
    const result = await leaveRide(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
