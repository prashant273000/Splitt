const { prisma } = require('../lib/prisma');

async function expireDepartedRides() {
  try {
    await prisma.ride.updateMany({
      where: { status: 'OPEN', departureTime: { lte: new Date() } },
      data: { status: 'DEPARTED' },
    });
    await prisma.ride.updateMany({
      where: { status: 'FULL', departureTime: { lte: new Date() } },
      data: { status: 'DEPARTED' },
    });
  } catch (err) {
    console.error('expireDepartedRides failed:', err);
  }
}

async function deactivateStaleIntents() {
  try {
    await prisma.intent.updateMany({
      where: { active: true, latestTime: { lt: new Date() } },
      data: { active: false },
    });
  } catch (err) {
    console.error('deactivateStaleIntents failed:', err);
  }
}

function startCron() {
  setInterval(expireDepartedRides, 60 * 1000);
  setInterval(deactivateStaleIntents, 60 * 60 * 1000);
}

module.exports = { startCron };
