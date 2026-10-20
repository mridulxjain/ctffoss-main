import { PrismaClient } from '@prisma/client';
import { APPROVED_ROSTER } from '../fixtures/approvedRoster';

const prisma = new PrismaClient();

async function seed() {
  console.log(`🚀 [Seed Approved Roster] Seeding ${APPROVED_ROSTER.length} approved roster members into database...`);

  let inserted = 0;
  let updated = 0;

  for (const member of APPROVED_ROSTER) {
    const cleanEmail = member.email.trim().toLowerCase();
    const result = await prisma.approvedRosterMember.upsert({
      where: { email: cleanEmail },
      create: {
        regnId: member.regnId,
        teamName: member.teamName,
        email: cleanEmail,
        isLeader: Boolean(member.isLeader),
      },
      update: {
        regnId: member.regnId,
        teamName: member.teamName,
        isLeader: Boolean(member.isLeader),
      },
    });

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      inserted++;
    } else {
      updated++;
    }
  }

  const total = await prisma.approvedRosterMember.count();
  console.log(`✅ [Seed Approved Roster] Successfully synced approved roster:`);
  console.log(`   - Processed: ${APPROVED_ROSTER.length}`);
  console.log(`   - Total in database: ${total}`);

  await prisma.$disconnect();
}

seed().catch(async (err) => {
  console.error('❌ [Seed Approved Roster] Failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
