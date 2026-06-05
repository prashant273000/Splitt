const { prisma } = require('../../lib/prisma');
const { sseManager } = require('../../lib/sse-manager');

async function findMatchesForRide(ride) {
  const intents = await prisma.intent.findMany({
    where: {
      active: true,
      direction: ride.direction,
      otherPoint: ride.otherPoint,
      earliestTime: { lte: ride.departureTime },
      latestTime: { gte: ride.departureTime },
      OR: [{ maxFare: null }, { maxFare: { gte: ride.farePerHead } }],
      userId: { not: ride.posterId },
    },
  });

  for (const intent of intents) {
    const match = await prisma.match.upsert({
      where: { rideId_intentId: { rideId: ride.id, intentId: intent.id } },
      create: { rideId: ride.id, intentId: intent.id },
      update: {},
    });
    const payload = { matchId: match.id, rideId: ride.id, intentId: intent.id };
    sseManager.send(intent.userId, 'match.created', payload);
    sseManager.send(ride.posterId, 'match.created', payload);
  }
}

async function findMatchesForIntent(intent) {
  const rides = await prisma.ride.findMany({
    where: {
      status: 'OPEN',
      direction: intent.direction,
      otherPoint: intent.otherPoint,
      departureTime: { gte: intent.earliestTime, lte: intent.latestTime },
      seatsAvailable: { gt: 0 },
      ...(intent.maxFare != null ? { farePerHead: { lte: intent.maxFare } } : {}),
      posterId: { not: intent.userId },
    },
  });

  for (const ride of rides) {
    const match = await prisma.match.upsert({
      where: { rideId_intentId: { rideId: ride.id, intentId: intent.id } },
      create: { rideId: ride.id, intentId: intent.id },
      update: {},
    });
    const payload = { matchId: match.id, rideId: ride.id, intentId: intent.id };
    sseManager.send(ride.posterId, 'match.created', payload);
    sseManager.send(intent.userId, 'match.created', payload);
  }
}

async function getMatchesForUser(userId) {
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { ride: { posterId: userId } },
        { intent: { userId: userId } },
      ],
    },
    include: {
      ride: {
        include: { poster: true },
      },
      intent: {
        include: { user: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return matches.map((match) => {
    const isPoster = match.ride.posterId === userId;
    const otherUser = isPoster ? match.intent.user : match.ride.poster;
    const bothConfirmed = match.posterConfirmed && match.seekerConfirmed;

    const otherUserShape = {
      id: otherUser.id,
      name: otherUser.name,
      picture: otherUser.picture,
      thumbsUp: otherUser.thumbsUp,
      thumbsDown: otherUser.thumbsDown,
    };
    if (bothConfirmed) {
      otherUserShape.phone = otherUser.phone;
    }

    return {
      id: match.id,
      rideId: match.rideId,
      intentId: match.intentId,
      posterConfirmed: match.posterConfirmed,
      seekerConfirmed: match.seekerConfirmed,
      myRole: isPoster ? 'poster' : 'seeker',
      createdAt: match.createdAt,
      ride: {
        id: match.ride.id,
        direction: match.ride.direction,
        otherPoint: match.ride.otherPoint,
        departureTime: match.ride.departureTime,
        seatsTotal: match.ride.seatsTotal,
        seatsAvailable: match.ride.seatsAvailable,
        farePerHead: match.ride.farePerHead,
        notes: match.ride.notes,
        status: match.ride.status,
      },
      otherUser: otherUserShape,
    };
  });
}

async function confirmMatch(matchId, userId) {
  const txResult = await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        ride: { include: { participants: { select: { userId: true } } } },
        intent: true,
      },
    });

    if (!match) {
      const err = new Error('Match not found');
      err.status = 404;
      throw err;
    }

    const isPoster = match.ride.posterId === userId;
    const isSeeker = match.intent.userId === userId;
    if (!isPoster && !isSeeker) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }

    const updated = await tx.match.update({
      where: { id: matchId },
      data: isPoster ? { posterConfirmed: true } : { seekerConfirmed: true },
    });

    if (!updated.posterConfirmed || !updated.seekerConfirmed) {
      return { match: updated, fully: false };
    }

    // updateMany guard prevents concurrent double-booking without SELECT FOR UPDATE.
    const { count } = await tx.ride.updateMany({
      where: { id: match.rideId, seatsAvailable: { gt: 0 } },
      data: { seatsAvailable: { decrement: 1 } },
    });

    if (count === 0) {
      const err = new Error('Ride is full');
      err.status = 409;
      throw err;
    }

    const updatedRide = await tx.ride.findUnique({ where: { id: match.rideId } });
    if (updatedRide.seatsAvailable === 0) {
      await tx.ride.update({ where: { id: match.rideId }, data: { status: 'FULL' } });
    }

    await tx.rideParticipant.create({
      data: { rideId: match.rideId, userId: match.intent.userId },
    });

    await tx.intent.update({
      where: { id: match.intentId },
      data: { active: false },
    });

    const siblings = await tx.match.findMany({
      where: { intentId: match.intentId, id: { not: matchId } },
      include: { ride: { select: { posterId: true } } },
    });
    await tx.match.deleteMany({ where: { intentId: match.intentId, id: { not: matchId } } });

    return {
      match: updated,
      fully: true,
      rideId: match.rideId,
      posterUserId: match.ride.posterId,
      seekerUserId: match.intent.userId,
      existingParticipantIds: match.ride.participants.map((p) => p.userId),
      siblings,
    };
  });

  // SSE fires after the transaction commits so clients refetch already-committed state.
  if (txResult.fully) {
    const { match, rideId, posterUserId, seekerUserId, existingParticipantIds, siblings } =
      txResult;

    sseManager.send(posterUserId, 'match.confirmed', { matchId: match.id, rideId });
    sseManager.send(seekerUserId, 'match.confirmed', { matchId: match.id, rideId });

    for (const sibling of siblings) {
      sseManager.send(sibling.ride.posterId, 'match.cancelled', { matchId: sibling.id });
    }

    const allParticipantIds = [...new Set([...existingParticipantIds, seekerUserId])];
    for (const id of allParticipantIds) {
      sseManager.send(id, 'ride.updated', { rideId });
    }
  }

  return txResult.match;
}

async function rejectMatch(matchId, userId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      ride: { select: { posterId: true } },
      intent: { select: { userId: true } },
    },
  });

  if (!match) {
    const err = new Error('Match not found');
    err.status = 404;
    throw err;
  }

  const isPoster = match.ride.posterId === userId;
  const isSeeker = match.intent.userId === userId;
  if (!isPoster && !isSeeker) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  await prisma.match.delete({ where: { id: matchId } });

  const otherUserId = isPoster ? match.intent.userId : match.ride.posterId;
  sseManager.send(otherUserId, 'match.cancelled', { matchId });

  return { ok: true };
}

module.exports = { findMatchesForRide, findMatchesForIntent, getMatchesForUser, confirmMatch, rejectMatch };
