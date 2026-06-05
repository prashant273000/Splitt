const { prisma } = require('../../lib/prisma');
const { sseManager } = require('../../lib/sse-manager');
const { findMatchesForRide } = require('../matches/matches.service');

async function createRide(data, posterId) {
  const ride = await prisma.$transaction(async (tx) => {
    const created = await tx.ride.create({
      data: {
        posterId,
        direction: data.direction,
        otherPoint: data.otherPoint,
        departureTime: new Date(data.departureTime),
        seatsTotal: data.seatsTotal,
        seatsAvailable: data.seatsTotal - 1,
        farePerHead: data.farePerHead,
        notes: data.notes ?? null,
      },
    });

    await tx.rideParticipant.create({
      data: { rideId: created.id, userId: posterId },
    });

    return created;
  });

  // Matching runs post-transaction so the ride is committed and visible to the intent query.
  await findMatchesForRide(ride);

  return ride;
}

async function getRideById(rideId, userId) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      poster: { select: { id: true, name: true, picture: true, thumbsUp: true, thumbsDown: true } },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, picture: true, thumbsUp: true, thumbsDown: true },
          },
        },
      },
      matches: {
        where: {
          OR: [{ ride: { posterId: userId } }, { intent: { userId } }],
        },
        select: {
          id: true,
          intentId: true,
          posterConfirmed: true,
          seekerConfirmed: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ride || ride.deletedAt !== null) {
    const err = new Error('Ride not found');
    err.status = 404;
    throw err;
  }

  return {
    id: ride.id,
    direction: ride.direction,
    otherPoint: ride.otherPoint,
    departureTime: ride.departureTime,
    seatsTotal: ride.seatsTotal,
    seatsAvailable: ride.seatsAvailable,
    farePerHead: ride.farePerHead,
    notes: ride.notes,
    status: ride.status,
    createdAt: ride.createdAt,
    poster: ride.poster,
    participants: ride.participants.map((p) => ({
      userId: p.userId,
      joinedAt: p.joinedAt,
      user: p.user,
    })),
    matches: ride.matches,
  };
}

async function cancelRide(rideId, userId) {
  const { cancelledMatches, participantIds } = await prisma.$transaction(async (tx) => {
    const ride = await tx.ride.findUnique({
      where: { id: rideId },
      include: {
        participants: { select: { userId: true } },
        matches: { include: { intent: { select: { userId: true } } } },
      },
    });

    if (!ride || ride.deletedAt !== null) {
      const err = new Error('Ride not found');
      err.status = 404;
      throw err;
    }
    if (ride.posterId !== userId) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    if (ride.status === 'DEPARTED' || ride.status === 'CANCELLED') {
      const err = new Error('Ride cannot be cancelled');
      err.status = 409;
      throw err;
    }

    await tx.ride.update({
      where: { id: rideId },
      data: { status: 'CANCELLED', deletedAt: new Date() },
    });

    // Collect seekerUserIds before deleting matches — needed for SSE notifications after commit.
    const matchData = ride.matches.map((m) => ({
      matchId: m.id,
      seekerUserId: m.intent.userId,
    }));
    const pIds = ride.participants.map((p) => p.userId);

    await tx.match.deleteMany({ where: { rideId } });

    return { cancelledMatches: matchData, participantIds: pIds };
  });

  for (const { matchId, seekerUserId } of cancelledMatches) {
    sseManager.send(seekerUserId, 'match.cancelled', { matchId });
  }
  for (const id of participantIds) {
    sseManager.send(id, 'ride.updated', { rideId });
  }

  return { ok: true };
}

async function joinRide(rideId, userId) {
  const { ride, allParticipantIds } = await prisma.$transaction(async (tx) => {
    const txRide = await tx.ride.findUnique({
      where: { id: rideId },
      include: { participants: { select: { userId: true } } },
    });

    if (!txRide || txRide.deletedAt !== null) {
      const err = new Error('Ride not found');
      err.status = 404;
      throw err;
    }
    if (txRide.status !== 'OPEN') {
      const err = new Error('Ride is not open');
      err.status = 409;
      throw err;
    }

    const alreadyJoined = txRide.participants.some((p) => p.userId === userId);
    if (alreadyJoined) {
      const err = new Error('Already a participant');
      err.status = 409;
      throw err;
    }

    // updateMany guard prevents concurrent double-booking without SELECT FOR UPDATE.
    const { count } = await tx.ride.updateMany({
      where: { id: rideId, seatsAvailable: { gt: 0 } },
      data: { seatsAvailable: { decrement: 1 } },
    });

    if (count === 0) {
      const err = new Error('Ride is full');
      err.status = 409;
      throw err;
    }

    await tx.rideParticipant.create({ data: { rideId, userId } });

    const afterDecrement = await tx.ride.findUnique({ where: { id: rideId } });
    if (afterDecrement.seatsAvailable === 0) {
      await tx.ride.update({ where: { id: rideId }, data: { status: 'FULL' } });
    }
    const finalRide = await tx.ride.findUnique({ where: { id: rideId } });

    const participantList = [...txRide.participants.map((p) => p.userId), userId];
    return { ride: finalRide, allParticipantIds: participantList };
  });

  for (const id of allParticipantIds) {
    sseManager.send(id, 'ride.updated', { rideId });
  }

  return ride;
}

async function leaveRide(rideId, userId) {
  const remainingParticipantIds = await prisma.$transaction(async (tx) => {
    const ride = await tx.ride.findUnique({
      where: { id: rideId },
      include: { participants: { select: { userId: true } } },
    });

    if (!ride || ride.deletedAt !== null) {
      const err = new Error('Ride not found');
      err.status = 404;
      throw err;
    }
    if (ride.posterId === userId) {
      const err = new Error('Poster must cancel the ride instead of leaving');
      err.status = 403;
      throw err;
    }

    const participant = ride.participants.find((p) => p.userId === userId);
    if (!participant) {
      const err = new Error('Not a participant');
      err.status = 404;
      throw err;
    }

    await tx.rideParticipant.deleteMany({ where: { rideId, userId } });

    await tx.ride.update({
      where: { id: rideId },
      data: {
        seatsAvailable: { increment: 1 },
        ...(ride.status === 'FULL' ? { status: 'OPEN' } : {}),
      },
    });

    return ride.participants.filter((p) => p.userId !== userId).map((p) => p.userId);
  });

  for (const id of remainingParticipantIds) {
    sseManager.send(id, 'ride.updated', { rideId });
  }

  return { ok: true };
}

async function getMyActiveRides(userId) {
  return prisma.ride.findMany({
    where: {
      posterId: userId,
      status: { in: ['OPEN', 'FULL'] },
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = { createRide, getRideById, cancelRide, joinRide, leaveRide, getMyActiveRides };
