const rateLimit = require('express-rate-limit');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Key by authenticated user id, not by IP.
function keyByUser(req) {
  return req.user ? req.user.id : req.ip;
}

const skipInTest = () => process.env.NODE_ENV === 'test';

const rideCreateLimiter = rateLimit({
  windowMs: HOUR,
  max: 5,
  keyGenerator: keyByUser,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many ride posts. Try again in an hour.' },
});

const intentCreateLimiter = rateLimit({
  windowMs: DAY,
  max: 20,
  keyGenerator: keyByUser,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many intent posts. Try again tomorrow.' },
});

const ratingCreateLimiter = rateLimit({
  windowMs: DAY,
  max: 50,
  keyGenerator: keyByUser,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many ratings submitted. Try again tomorrow.' },
});

module.exports = { rideCreateLimiter, intentCreateLimiter, ratingCreateLimiter };
