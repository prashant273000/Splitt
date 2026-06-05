const { z } = require('zod');

const createIntentSchema = z
  .object({
    direction: z.enum(['FROM_CAMPUS', 'TO_CAMPUS']),
    otherPoint: z.enum(['RAILWAY_STATION', 'BUS_STAND', 'CITY_CENTER', 'AIRPORT']),
    earliestTime: z.string().datetime(),
    latestTime: z.string().datetime(),
    maxFare: z.number().int().min(1).optional(),
  })
  .refine((d) => new Date(d.latestTime) > new Date(d.earliestTime), {
    message: 'latestTime must be after earliestTime',
    path: ['latestTime'],
  });

module.exports = { createIntentSchema };
