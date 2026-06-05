const { z } = require('zod');

const createRideSchema = z.object({
  direction: z.enum(['FROM_CAMPUS', 'TO_CAMPUS']),
  otherPoint: z.enum(['RAILWAY_STATION', 'BUS_STAND', 'CITY_CENTER', 'AIRPORT']),
  departureTime: z.string().datetime(),
  seatsTotal: z.number().int().min(2).max(6),
  farePerHead: z.number().int().min(1).max(500),
  notes: z.string().max(200).optional(),
});

module.exports = { createRideSchema };
