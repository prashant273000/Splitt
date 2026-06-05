const { prisma } = require('../../lib/prisma');
const { sseManager } = require('../../lib/sse-manager');
const { findMatchesForIntent } = require('../matches/matches.service');

async function createIntent(data, userId) {
  const intent = await prisma.intent.create({
    data: {
      userId,
      direction: data.direction,
      otherPoint: data.otherPoint,
      earliestTime: new Date(data.earliestTime),
      latestTime: new Date(data.latestTime),
      maxFare: data.maxFare ?? null,
    },
  });

  await findMatchesForIntent(intent);

  return intent;
}

async function getIntentsForUser(userId) {
  const intents = await prisma.intent.findMany({
    where: { userId, active: true },
    include: { _count: { select: { matches: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return intents.map(({ _count, ...intent }) => ({
    ...intent,
    matchCount: _count.matches,
  }));
}

async function cancelIntent(intentId, userId) {
  const affectedPosterIds = await prisma.$transaction(async (tx) => {
    const intent = await tx.intent.findUnique({
      where: { id: intentId },
      include: {
        matches: { include: { ride: { select: { posterId: true } } } },
      },
    });

    if (!intent) {
      const err = new Error('Intent not found');
      err.status = 404;
      throw err;
    }
    if (intent.userId !== userId) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }

    const posterIds = intent.matches.map((m) => ({
      matchId: m.id,
      posterId: m.ride.posterId,
    }));

    await tx.match.deleteMany({ where: { intentId } });
    await tx.intent.delete({ where: { id: intentId } });

    return posterIds;
  });

  for (const { matchId, posterId } of affectedPosterIds) {
    sseManager.send(posterId, 'match.cancelled', { matchId });
  }

  return { ok: true };
}

module.exports = { createIntent, getIntentsForUser, cancelIntent };
