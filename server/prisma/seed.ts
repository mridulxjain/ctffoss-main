import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { DEV_TEAMS, DEV_PARTICIPANTS } from '../src/fixtures/devRoster';

const prisma = new PrismaClient();

const flagPepper = process.env.FLAG_PEPPER || 'foss-ctf-flag-pepper-secret-dev-replace-in-prod';

function hashFlag(flag: string): string {
  return crypto.createHmac('sha256', flagPepper).update(flag.trim()).digest('hex');
}

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Categories
  const categories = [
    { id: 'cat-misc-1', name: 'Miscellaneous', description: 'Introductory and general knowledge puzzles.', sortOrder: 1 },
    { id: 'cat-web-2', name: 'Web Exploitation', description: 'HTTP, browser security, injection, and client-server bugs.', sortOrder: 2 },
    { id: 'cat-crypto-3', name: 'Cryptography', description: 'Ciphers, mathematical vulnerabilities, and hash attacks.', sortOrder: 3 },
    { id: 'cat-rev-4', name: 'Reverse Engineering', description: 'Decompilation, binary analysis, and assembly logic.', sortOrder: 4 },
    { id: 'cat-forensics-5', name: 'Forensics', description: 'Steganography, packet capture analysis, and file formats.', sortOrder: 5 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
      create: cat,
    });
  }
  console.log(`✅ Seeded ${categories.length} categories.`);

  // 2. Competition Config
  const initialConfig = {
    title: 'FOSS CTF 2026',
    description: 'Official University Capture The Flag Competition organized by FOSS Club.',
    startTime: null,
    endTime: null,
    isPaused: false,
    state: 'PREPARING',
  };

  await prisma.competitionConfig.upsert({
    where: { key: 'main' },
    update: {},
    create: {
      key: 'main',
      value: JSON.stringify(initialConfig),
    },
  });
  console.log('✅ Seeded competition configuration.');

  // 3. Loventia Challenge
  const loventia = await prisma.challenge.upsert({
    where: { slug: 'valenfind' },
    update: {
      title: 'Loventia',
      description:
        'Loventia is a fictional dating platform featuring client-side and server-side web exploitation vulnerabilities.\n\nOnce the competition unlocks and starts, open the challenge environment in a new tab, investigate the application, claim your team promotional voucher, and submit the issued competition flag back here before time expires.\n\nAll teammates share the exact same start timestamp and authoritative elapsed time.',
      points: 200,
      difficulty: 'MEDIUM',
      isPublished: true,
      isArchived: false,
      isTimed: true,
      durationMinutes: 45,
      author: 'FOSS Security Squad',
    },
    create: {
      id: 'chal-valenfind-competition',
      slug: 'valenfind',
      title: 'Loventia',
      description:
        'Loventia is a fictional dating platform featuring client-side and server-side web exploitation vulnerabilities.\n\nOnce the competition unlocks and starts, open the challenge environment in a new tab, investigate the application, claim your team promotional voucher, and submit the issued competition flag back here before time expires.\n\nAll teammates share the exact same start timestamp and authoritative elapsed time.',
      categoryId: 'cat-web-2',
      difficulty: 'MEDIUM',
      points: 200,
      isPublished: true,
      isArchived: false,
      isTimed: true,
      durationMinutes: 45,
      author: 'FOSS Security Squad',
      sortOrder: 1,
    },
  });
  console.log(`✅ Seeded Loventia challenge (${loventia.slug}).`);

  // 4. Sample & Development data (Strictly forbidden in production environments)
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (isProd) {
    console.log('🔒 Production mode detected: Skipping development squads, test accounts, and sample challenges.');
    console.log('🎉 Production database seed completed safely without creating test data.');
    return;
  }

  console.log('🔧 Seeding development teams and verification challenges...');

  // Practice Challenge 1: Misc
  const devChal = await prisma.challenge.upsert({
    where: { slug: 'development-verification-challenge' },
    update: { isArchived: false, isPublished: true },
    create: {
      id: 'chal-dev-sample-1',
      slug: 'development-verification-challenge',
      title: 'Development Verification Challenge',
      description: 'Practice challenge for scoring and verification checks.',
      categoryId: 'cat-misc-1',
      difficulty: 'EASY',
      points: 100,
      isPublished: true,
      isArchived: false,
      sortOrder: 2,
    },
  });

  const existingFlag = await prisma.flag.findFirst({ where: { challengeId: devChal.id } });
  if (!existingFlag) {
    await prisma.flag.create({
      data: {
        challengeId: devChal.id,
        flagHash: hashFlag('FOSSCTF{dev_verification_flag_2026}'),
        isCaseSensitive: true,
      },
    });
  }

  // Practice Challenge 2: Crypto
  const cryptoChal = await prisma.challenge.upsert({
    where: { slug: 'caesar-cipher-break' },
    update: { isArchived: false, isPublished: true },
    create: {
      id: 'chal-crypto-sample-3',
      slug: 'caesar-cipher-break',
      title: "Caesar's Modern Cipher",
      description: 'Standard Caesar shift with key 3.\n\nCiphertext: IRVVFWI{fdhvdu_flskhu_ghfubswhg_2026}',
      categoryId: 'cat-crypto-3',
      difficulty: 'EASY',
      points: 100,
      isPublished: true,
      isArchived: false,
      sortOrder: 4,
    },
  });

  const existingCryptoFlag = await prisma.flag.findFirst({ where: { challengeId: cryptoChal.id } });
  if (!existingCryptoFlag) {
    await prisma.flag.create({
      data: {
        challengeId: cryptoChal.id,
        flagHash: hashFlag('FOSSCTF{caesar_cipher_decrypted_2026}'),
        isCaseSensitive: true,
      },
    });
  }

    // Development Teams (Legacy)
    const team1 = await prisma.team.upsert({
      where: { id: 'team-binary-beasts' },
      update: {},
      create: {
        id: 'team-binary-beasts',
        name: 'Binary Beasts',
        externalId: 'ext-team-alpha',
        valenfindTeamId: 'e4e8c7ee-8a3c-49f7-a23a-1fbf9d3e386a',
        isReady: false,
      },
    });

    const team2 = await prisma.team.upsert({
      where: { id: 'team-null-pointers' },
      update: {},
      create: {
        id: 'team-null-pointers',
        name: 'Null Pointers',
        externalId: 'ext-team-beta',
        valenfindTeamId: '8f7a6b5c-4d3e-2f1a-0b9c-8d7e6f5a4b3c',
        isReady: false,
      },
    });

    // Four Official Dev Test Teams
    for (const dt of DEV_TEAMS) {
      await prisma.team.upsert({
        where: { id: dt.id },
        update: { name: dt.name, externalId: dt.externalId, valenfindTeamId: dt.valenfindTeamId },
        create: {
          id: dt.id,
          name: dt.name,
          externalId: dt.externalId,
          valenfindTeamId: dt.valenfindTeamId,
          isReady: false,
        },
      });
    }

    // Dev Personas (Legacy)
    const personas = [
      { id: 'usr-admin-01', email: 'admin@fossclub.tech', username: 'foss_admin', role: 'ADMIN' as const, teamId: null },
      { id: 'usr-alice-02', email: 'alice@university.edu', username: 'alice_sec', role: 'USER' as const, teamId: team1.id },
      { id: 'usr-bob-03', email: 'bob@university.edu', username: 'bob_0x', role: 'USER' as const, teamId: team1.id },
      { id: 'usr-charlie-04', email: 'charlie@university.edu', username: 'charlie_solo', role: 'USER' as const, teamId: null },
      { id: 'usr-dave-05', email: 'dave@university.edu', username: 'dave_bravo', role: 'USER' as const, teamId: team2.id },
    ];

    for (const p of personas) {
      await prisma.user.upsert({
        where: { id: p.id },
        update: { teamId: p.teamId, role: p.role },
        create: {
          id: p.id,
          email: p.email,
          username: p.username,
          role: p.role,
          teamId: p.teamId,
        },
      });
    }

    // 16 Fictional Participants (4 per team)
    for (const dp of DEV_PARTICIPANTS) {
      await prisma.user.upsert({
        where: { id: dp.id },
        update: { email: dp.email, username: dp.username, teamId: dp.teamId, role: dp.role },
        create: {
          id: dp.id,
          email: dp.email,
          username: dp.username,
          role: dp.role,
          teamId: dp.teamId,
        },
      });
    }

    console.log(`✅ Seeded ${personas.length + DEV_PARTICIPANTS.length} development users and ${2 + DEV_TEAMS.length} teams.`);

  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Database seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
