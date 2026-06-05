const { prisma } = require('../../lib/prisma');

async function getUserById(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return {
    id: user.id,
    name: user.name,
    picture: user.picture,
    thumbsUp: user.thumbsUp,
    thumbsDown: user.thumbsDown,
    createdAt: user.createdAt,
  };
}

module.exports = { getUserById };
