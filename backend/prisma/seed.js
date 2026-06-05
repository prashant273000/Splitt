const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dev = await prisma.user.upsert({
    where: { email: 'dev@iiitdmj.ac.in' },
    update: {},
    create: { email: 'dev@iiitdmj.ac.in', name: 'Dev User' },
  });
  const alice = await prisma.user.upsert({
    where: { email: 'alice@iiitdmj.ac.in' },
    update: {},
    create: { email: 'alice@iiitdmj.ac.in', name: 'Alice' },
  });
  const bob = await prisma.user.upsert({
    where: { email: 'bob@iiitdmj.ac.in' },
    update: {},
    create: { email: 'bob@iiitdmj.ac.in', name: 'Bob' },
  });
  console.log('Seeded users:', { dev: dev.id, alice: alice.id, bob: bob.id });
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
