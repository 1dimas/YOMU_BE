import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const loans = await prisma.loan.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { id: true, status: true, reportedDamaged: true, studentNote: true }
  });
  console.log(loans);
}
main().catch(console.error).finally(() => prisma.$disconnect());
