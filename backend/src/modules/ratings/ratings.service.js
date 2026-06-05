const { prisma } = require('../../lib/prisma');
const { sseManager } = require('../../lib/sse-manager');

async function createRating(data, fromUserId) {
  const { toUserId, rideId, thumbsUp } = data;

  if (fromUserId === toUserId) {
    const err = new Error('Cannot rate yourself');
    err.status = 400;
    throw err;
  }

  const rating = await prisma.$transaction(async (tx) => {
    const ride = await tx.ride.findUnique({
      where: { id: rideId },
      include: { participants: { select: { userId: true } } },
    });

    if (!ride) {
      const err = new Error('Ride not found');
      err.status = 404;
      throw err;
    }
    if (ride.status !== 'DEPARTED') {
      const err = new Error('Ride has not departed yet');
      err.status = 409;
      throw err;
    }

    const participantIds = ride.participants.map((p) => p.userId);
    if (!participantIds.includes(fromUserId)) {
      const err = new Error('You were not a participant on this ride');
      err.status = 403;
      throw err;
    }
    if (!participantIds.includes(toUserId)) {
      const err = new Error('Target user was not a participant on this ride');
      err.status = 403;
      throw err;
    }

    const existing = await tx.rating.findUnique({
      where: { fromUserId_toUserId_rideId: { fromUserId, toUserId, rideId } },
    });
    if (existing) {
      const err = new Error('Already rated this user for this ride');
      err.status = 409;
      throw err;
    }

    const created = await tx.rating.create({
      data: { fromUserId, toUserId, rideId, thumbsUp },
    });

    await tx.user.update({
      where: { id: toUserId },
      data: thumbsUp ? { thumbsUp: { increment: 1 } } : { thumbsDown: { increment: 1 } },
    });

    return created;
  });

  sseManager.send(toUserId, 'rating.received', { ratingId: rating.id, fromUserId, thumbsUp });

  return rating;
}

module.exports = { createRating };
