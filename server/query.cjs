const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.session.findMany().then(sessions => {
  console.log('SESSIONS COUNT:', sessions.length);
  if (sessions.length > 0) {
    console.log('FIRST SESSION:', sessions[0]);
  }
}).finally(() => prisma.$disconnect());
