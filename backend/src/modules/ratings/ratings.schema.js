const { z } = require('zod');

const createRatingSchema = z.object({
  toUserId: z.string().min(1),
  rideId: z.string().min(1),
  thumbsUp: z.boolean(),
});

module.exports = { createRatingSchema };
