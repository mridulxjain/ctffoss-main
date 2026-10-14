import { prisma } from '../lib/prisma';
import { hashFlag, generateInviteCode } from '../utils/crypto';
import { Role, Difficulty } from '@fossctf/shared';

export interface DBUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  teamId: string | null;
  createdAt: Date;
}

export interface DBTeam {
  id: string;
  name: string;
  inviteCode: string;
  totalScore: number;
  lastSolveAt: Date | null;
  members: DBUser[];
  createdAt: Date;
}

export interface DBCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface DBHint {
  id: string;
  challengeId: string;
  content: string;
  cost: number;
  sortOrder: number;
}

export interface DBChallenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  difficulty: Difficulty;
  points: number;
  isPublished: boolean;
  author: string | null;
  sortOrder: number;
  flagHash: string;
  hints: DBHint[];
}

export interface DBSolve {
  id: string;
  challengeId: string;
  teamId: string;
  userId: string;
  pointsAwarded: number;
  isFirstBlood: boolean;
  solvedAt: Date;
}

/**
 * In-memory fallback dataset for seamless zero-config local development
 * when PostgreSQL is not yet running or configured.
 */
class MemoryCTFStore {
  users: Map<string, DBUser> = new Map();
  teams: Map<string, DBTeam> = new Map();
  categories: DBCategory[] = [];
  challenges: DBChallenge[] = [];
  solves: DBSolve[] = [];
  unlockedHints: Set<string> = new Set(); // "teamId:hintId"

  constructor() {
    this.seed();
  }

  seed() {
    // Categories
    const catMisc: DBCategory = {
      id: 'cat-misc-1',
      name: 'Miscellaneous',
      description: 'Introductory and general knowledge puzzles.',
      sortOrder: 1,
    };
    const catWeb: DBCategory = {
      id: 'cat-web-2',
      name: 'Web Exploitation',
      description: 'HTTP, browser security, injection, and client-server bugs.',
      sortOrder: 2,
    };
    const catCrypto: DBCategory = {
      id: 'cat-crypto-3',
      name: 'Cryptography',
      description: 'Ciphers, mathematical vulnerabilities, and hash attacks.',
      sortOrder: 3,
    };
    const catRev: DBCategory = {
      id: 'cat-rev-4',
      name: 'Reverse Engineering',
      description: 'Decompilation, binary analysis, and assembly logic.',
      sortOrder: 4,
    };
    const catForensics: DBCategory = {
      id: 'cat-forensics-5',
      name: 'Forensics',
      description: 'Steganography, packet capture analysis, and file formats.',
      sortOrder: 5,
    };

    this.categories = [catMisc, catWeb, catCrypto, catRev, catForensics];

    // Seed Challenges
    this.challenges = [
      {
        id: 'chal-welcome-1',
        slug: 'welcome-to-foss-ctf',
        title: 'Welcome to FOSS CTF',
        description:
          'Welcome to the competition platform! To test your submission flow, submit the following flag:\n\n`FOSSCTF{welcome_to_foss_ctf_2026}`',
        categoryId: catMisc.id,
        difficulty: 'EASY',
        points: 50,
        isPublished: true,
        author: 'FOSS Club Admin',
        sortOrder: 1,
        flagHash: hashFlag('FOSSCTF{welcome_to_foss_ctf_2026}'),
        hints: [
          {
            id: 'hint-welcome-1',
            challengeId: 'chal-welcome-1',
            content: 'Copy and paste the flag exactly as shown, including the FOSSCTF{} wrapper.',
            cost: 0,
            sortOrder: 1,
          },
        ],
      },
      {
        id: 'chal-web-1',
        slug: 'inspect-the-vault',
        title: 'Inspect the Vault',
        description:
          'A novice developer built a secret vault on the client side thinking nobody would ever press `F12`. Can you find the secret passcode?\n\nFlag: `FOSSCTF{client_side_secrets_are_never_safe}`',
        categoryId: catWeb.id,
        difficulty: 'EASY',
        points: 100,
        isPublished: true,
        author: 'cyber_witch',
        sortOrder: 2,
        flagHash: hashFlag('FOSSCTF{client_side_secrets_are_never_safe}'),
        hints: [
          {
            id: 'hint-web-1',
            challengeId: 'chal-web-1',
            content: 'Always check source files, script comments, and bundle chunks.',
            cost: 10,
            sortOrder: 1,
          },
        ],
      },
      {
        id: 'chal-crypto-1',
        slug: 'caesars-rotation',
        title: "Caesar's Rotation",
        description:
          'Julius Caesar loved shifting alphabets by 13 positions. Decode this ciphertext:\n\n`SBFFPGS{pynffvp_rot13_vf_abg_rapelcgvba}`',
        categoryId: catCrypto.id,
        difficulty: 'EASY',
        points: 100,
        isPublished: true,
        author: 'cryptoknight',
        sortOrder: 3,
        flagHash: hashFlag('FOSSCTF{classic_rot13_is_not_encryption}'),
        hints: [
          {
            id: 'hint-crypto-1',
            challengeId: 'chal-crypto-1',
            content: 'ROT13 is a simple substitution cipher where each letter shifts by 13.',
            cost: 15,
            sortOrder: 1,
          },
        ],
      },
      {
        id: 'chal-rev-1',
        slug: 'byte-inspector',
        title: 'Byte Inspector',
        description:
          'Reverse engineering begins with understanding condition checks and data structures. Find the key that satisfies `hash(k) == target`.\n\nFlag: `FOSSCTF{decompiled_and_conquered}`',
        categoryId: catRev.id,
        difficulty: 'MEDIUM',
        points: 200,
        isPublished: true,
        author: 'hex_byte',
        sortOrder: 4,
        flagHash: hashFlag('FOSSCTF{decompiled_and_conquered}'),
        hints: [],
      },
      {
        id: 'chal-forensics-1',
        slug: 'hidden-artifact',
        title: 'Hidden Artifact',
        description:
          'Metadata embedded in image files often reveals hidden clues. Extract the hidden flag string:\n\nFlag: `FOSSCTF{exif_metadata_reveals_all}`',
        categoryId: catForensics.id,
        difficulty: 'MEDIUM',
        points: 250,
        isPublished: true,
        author: 'detective_0x',
        sortOrder: 5,
        flagHash: hashFlag('FOSSCTF{exif_metadata_reveals_all}'),
        hints: [],
      },
    ];

    // Seed mock teams & users for rich dev exploration
    const adminUser: DBUser = {
      id: 'usr-admin-01',
      email: 'admin@fossclub.tech',
      username: 'foss_admin',
      role: 'ADMIN',
      teamId: null,
      createdAt: new Date(),
    };

    const userAlice: DBUser = {
      id: 'usr-alice-02',
      email: 'alice@university.edu',
      username: 'alice_sec',
      role: 'USER',
      teamId: 'team-binary-beasts',
      createdAt: new Date(),
    };

    const userBob: DBUser = {
      id: 'usr-bob-03',
      email: 'bob@university.edu',
      username: 'bob_0x',
      role: 'USER',
      teamId: 'team-binary-beasts',
      createdAt: new Date(),
    };

    const userCharlie: DBUser = {
      id: 'usr-charlie-04',
      email: 'charlie@university.edu',
      username: 'charlie_hax',
      role: 'USER',
      teamId: 'team-null-pointers',
      createdAt: new Date(),
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(userAlice.id, userAlice);
    this.users.set(userBob.id, userBob);
    this.users.set(userCharlie.id, userCharlie);

    const team1: DBTeam = {
      id: 'team-binary-beasts',
      name: 'Binary Beasts',
      inviteCode: 'BEASTS2026',
      totalScore: 150,
      lastSolveAt: new Date(Date.now() - 3600000),
      members: [userAlice, userBob],
      createdAt: new Date(Date.now() - 86400000),
    };

    const team2: DBTeam = {
      id: 'team-null-pointers',
      name: 'Null Pointers',
      inviteCode: 'NULLPTR101',
      totalScore: 50,
      lastSolveAt: new Date(Date.now() - 7200000),
      members: [userCharlie],
      createdAt: new Date(Date.now() - 86400000),
    };

    this.teams.set(team1.id, team1);
    this.teams.set(team2.id, team2);

    // Initial Solves
    this.solves.push({
      id: 'solve-1',
      challengeId: 'chal-welcome-1',
      teamId: team1.id,
      userId: userAlice.id,
      pointsAwarded: 50,
      isFirstBlood: true,
      solvedAt: new Date(Date.now() - 3600000 * 2),
    });

    this.solves.push({
      id: 'solve-2',
      challengeId: 'chal-web-1',
      teamId: team1.id,
      userId: userBob.id,
      pointsAwarded: 100,
      isFirstBlood: true,
      solvedAt: new Date(Date.now() - 3600000),
    });

    this.solves.push({
      id: 'solve-3',
      challengeId: 'chal-welcome-1',
      teamId: team2.id,
      userId: userCharlie.id,
      pointsAwarded: 50,
      isFirstBlood: false,
      solvedAt: new Date(Date.now() - 7200000),
    });
  }
}

const memoryStore = new MemoryCTFStore();

let isPrismaAvailable: boolean | null = null;

async function checkPrisma(): Promise<boolean> {
  if (isPrismaAvailable !== null) return isPrismaAvailable;
  try {
    // Quick test query with a strict 1-second timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000)),
    ]);
    isPrismaAvailable = true;
    console.log('[Database] Connected to PostgreSQL via Prisma.');
  } catch {
    isPrismaAvailable = false;
    console.log(
      '[Database] Running in in-memory fallback store for local development. Configure DATABASE_URL in server/.env to use PostgreSQL.'
    );
  }
  return isPrismaAvailable;
}

export const dbService = {
  async getUser(id: string): Promise<DBUser | null> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const u = await prisma.user.findUnique({ where: { id } });
      if (!u) return null;
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role as Role,
        teamId: u.teamId,
        createdAt: u.createdAt,
      };
    }
    return memoryStore.users.get(id) || null;
  },

  async getUserByEmail(email: string): Promise<DBUser | null> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const u = await prisma.user.findUnique({ where: { email } });
      if (!u) return null;
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role as Role,
        teamId: u.teamId,
        createdAt: u.createdAt,
      };
    }
    for (const u of memoryStore.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  },

  async getUserByUsername(username: string): Promise<DBUser | null> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const u = await prisma.user.findUnique({ where: { username } });
      if (!u) return null;
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role as Role,
        teamId: u.teamId,
        createdAt: u.createdAt,
      };
    }
    for (const u of memoryStore.users.values()) {
      if (u.username.toLowerCase() === username.toLowerCase()) return u;
    }
    return null;
  },

  async createUser(data: {
    email: string;
    username: string;
    role: Role;
    teamId?: string | null;
  }): Promise<DBUser> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const u = await prisma.user.create({
        data: {
          email: data.email,
          username: data.username,
          role: data.role,
          teamId: data.teamId || null,
        },
      });
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role as Role,
        teamId: u.teamId,
        createdAt: u.createdAt,
      };
    }

    const newUser: DBUser = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: data.email,
      username: data.username,
      role: data.role,
      teamId: data.teamId || null,
      createdAt: new Date(),
    };
    memoryStore.users.set(newUser.id, newUser);
    return newUser;
  },

  async updateUserTeam(userId: string, teamId: string | null): Promise<void> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      await prisma.user.update({
        where: { id: userId },
        data: { teamId },
      });
      return;
    }

    const u = memoryStore.users.get(userId);
    if (u) {
      u.teamId = teamId;
      memoryStore.users.set(userId, u);
    }
  },

  async getTeam(id: string): Promise<DBTeam | null> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const t = await prisma.team.findUnique({
        where: { id },
        include: { members: true },
      });
      if (!t) return null;
      return {
        id: t.id,
        name: t.name,
        inviteCode: t.inviteCode,
        totalScore: t.totalScore,
        lastSolveAt: t.lastSolveAt,
        members: t.members.map((m) => ({
          id: m.id,
          email: m.email,
          username: m.username,
          role: m.role as Role,
          teamId: m.teamId,
          createdAt: m.createdAt,
        })),
        createdAt: t.createdAt,
      };
    }
    const t = memoryStore.teams.get(id);
    if (!t) return null;
    // ensure members are up to date
    t.members = Array.from(memoryStore.users.values()).filter((u) => u.teamId === t.id);
    return t;
  },

  async getTeamByInviteCode(inviteCode: string): Promise<DBTeam | null> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const t = await prisma.team.findUnique({
        where: { inviteCode },
        include: { members: true },
      });
      if (!t) return null;
      return {
        id: t.id,
        name: t.name,
        inviteCode: t.inviteCode,
        totalScore: t.totalScore,
        lastSolveAt: t.lastSolveAt,
        members: t.members.map((m) => ({
          id: m.id,
          email: m.email,
          username: m.username,
          role: m.role as Role,
          teamId: m.teamId,
          createdAt: m.createdAt,
        })),
        createdAt: t.createdAt,
      };
    }
    for (const t of memoryStore.teams.values()) {
      if (t.inviteCode.toUpperCase() === inviteCode.trim().toUpperCase()) {
        t.members = Array.from(memoryStore.users.values()).filter((u) => u.teamId === t.id);
        return t;
      }
    }
    return null;
  },

  async getTeamByName(name: string): Promise<DBTeam | null> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const t = await prisma.team.findUnique({
        where: { name },
        include: { members: true },
      });
      if (!t) return null;
      return {
        id: t.id,
        name: t.name,
        inviteCode: t.inviteCode,
        totalScore: t.totalScore,
        lastSolveAt: t.lastSolveAt,
        members: t.members.map((m) => ({
          id: m.id,
          email: m.email,
          username: m.username,
          role: m.role as Role,
          teamId: m.teamId,
          createdAt: m.createdAt,
        })),
        createdAt: t.createdAt,
      };
    }
    for (const t of memoryStore.teams.values()) {
      if (t.name.toLowerCase() === name.trim().toLowerCase()) {
        return t;
      }
    }
    return null;
  },

  async createTeam(name: string, creatorId: string): Promise<DBTeam> {
    const inviteCode = generateInviteCode();
    const hasDb = await checkPrisma();
    if (hasDb) {
      const newTeam = await prisma.$transaction(async (tx) => {
        const t = await tx.team.create({
          data: {
            name,
            inviteCode,
          },
        });
        await tx.user.update({
          where: { id: creatorId },
          data: { teamId: t.id },
        });
        return t;
      });
      return (await this.getTeam(newTeam.id))!;
    }

    const newTeam: DBTeam = {
      id: `team-${Date.now()}`,
      name,
      inviteCode,
      totalScore: 0,
      lastSolveAt: null,
      members: [],
      createdAt: new Date(),
    };
    memoryStore.teams.set(newTeam.id, newTeam);
    await this.updateUserTeam(creatorId, newTeam.id);
    return (await this.getTeam(newTeam.id))!;
  },

  async listCategories(): Promise<DBCategory[]> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const cats = await prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      return cats;
    }
    return memoryStore.categories;
  },

  async listChallenges(teamId?: string | null): Promise<any[]> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const chals = await prisma.challenge.findMany({
        where: { isPublished: true },
        include: {
          category: true,
          solves: true,
        },
        orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
      });

      return chals.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        categoryId: c.categoryId,
        categoryName: c.category.name,
        difficulty: c.difficulty,
        points: c.points,
        solveCount: c.solves.length,
        isSolvedByTeam: teamId ? c.solves.some((s) => s.teamId === teamId) : false,
        author: c.author,
      }));
    }

    return memoryStore.challenges.map((c) => {
      const cat = memoryStore.categories.find((k) => k.id === c.categoryId);
      const chSolves = memoryStore.solves.filter((s) => s.challengeId === c.id);
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        categoryId: c.categoryId,
        categoryName: cat?.name || 'General',
        difficulty: c.difficulty,
        points: c.points,
        solveCount: chSolves.length,
        isSolvedByTeam: teamId ? chSolves.some((s) => s.teamId === teamId) : false,
        author: c.author,
      };
    });
  },

  async getChallengeDetail(challengeId: string, teamId?: string | null): Promise<any | null> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const c = await prisma.challenge.findUnique({
        where: { id: challengeId },
        include: {
          category: true,
          hints: { orderBy: { sortOrder: 'asc' } },
          solves: true,
        },
      });
      if (!c || !c.isPublished) return null;

      let unlockedHintIds = new Set<string>();
      if (teamId) {
        const unlocks = await prisma.hintUnlock.findMany({
          where: { teamId, hint: { challengeId } },
        });
        unlockedHintIds = new Set(unlocks.map((u) => u.hintId));
      }

      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        categoryId: c.categoryId,
        categoryName: c.category.name,
        difficulty: c.difficulty,
        points: c.points,
        solveCount: c.solves.length,
        isSolvedByTeam: teamId ? c.solves.some((s) => s.teamId === teamId) : false,
        author: c.author,
        hints: c.hints.map((h) => ({
          id: h.id,
          cost: h.cost,
          sortOrder: h.sortOrder,
          isUnlocked: unlockedHintIds.has(h.id) || h.cost === 0,
          content: unlockedHintIds.has(h.id) || h.cost === 0 ? h.content : undefined,
        })),
      };
    }

    const c = memoryStore.challenges.find((k) => k.id === challengeId);
    if (!c || !c.isPublished) return null;
    const cat = memoryStore.categories.find((k) => k.id === c.categoryId);
    const chSolves = memoryStore.solves.filter((s) => s.challengeId === c.id);

    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      categoryId: c.categoryId,
      categoryName: cat?.name || 'General',
      difficulty: c.difficulty,
      points: c.points,
      solveCount: chSolves.length,
      isSolvedByTeam: teamId ? chSolves.some((s) => s.teamId === teamId) : false,
      author: c.author,
      hints: c.hints.map((h) => {
        const isUnlocked =
          h.cost === 0 || (teamId ? memoryStore.unlockedHints.has(`${teamId}:${h.id}`) : false);
        return {
          id: h.id,
          cost: h.cost,
          sortOrder: h.sortOrder,
          isUnlocked,
          content: isUnlocked ? h.content : undefined,
        };
      }),
    };
  },

  async hasTeamSolved(teamId: string, challengeId: string): Promise<boolean> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const solve = await prisma.solve.findUnique({
        where: { teamId_challengeId: { teamId, challengeId } },
      });
      return !!solve;
    }
    return memoryStore.solves.some(
      (s) => s.teamId === teamId && s.challengeId === challengeId
    );
  },

  async recordSolve(params: {
    challengeId: string;
    teamId: string;
    userId: string;
    points: number;
  }): Promise<{ isFirstBlood: boolean; pointsAwarded: number }> {
    const { challengeId, teamId, userId, points } = params;
    const hasDb = await checkPrisma();

    if (hasDb) {
      return await prisma.$transaction(async (tx) => {
        // Check prior solve count for First Blood detection
        const priorSolves = await tx.solve.count({ where: { challengeId } });
        const isFirstBlood = priorSolves === 0;

        await tx.solve.create({
          data: {
            challengeId,
            teamId,
            userId,
            pointsAwarded: points,
            isFirstBlood,
          },
        });

        await tx.team.update({
          where: { id: teamId },
          data: {
            totalScore: { increment: points },
            lastSolveAt: new Date(),
          },
        });

        return { isFirstBlood, pointsAwarded: points };
      });
    }

    const priorSolves = memoryStore.solves.filter((s) => s.challengeId === challengeId);
    const isFirstBlood = priorSolves.length === 0;
    const now = new Date();

    memoryStore.solves.push({
      id: `solve-${Date.now()}`,
      challengeId,
      teamId,
      userId,
      pointsAwarded: points,
      isFirstBlood,
      solvedAt: now,
    });

    const team = memoryStore.teams.get(teamId);
    if (team) {
      team.totalScore += points;
      team.lastSolveAt = now;
    }

    return { isFirstBlood, pointsAwarded: points };
  },

  async getScoreboard(): Promise<any[]> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const teams = await prisma.team.findMany({
        where: { totalScore: { gt: 0 } },
        orderBy: [{ totalScore: 'desc' }, { lastSolveAt: 'asc' }],
        include: {
          solves: true,
        },
      });

      return teams.map((t, index) => ({
        rank: index + 1,
        teamId: t.id,
        teamName: t.name,
        totalScore: t.totalScore,
        solvesCount: t.solves.length,
        lastSolveAt: t.lastSolveAt ? t.lastSolveAt.toISOString() : null,
      }));
    }

    const allTeams = Array.from(memoryStore.teams.values())
      .filter((t) => t.totalScore > 0)
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        const timeA = a.lastSolveAt ? a.lastSolveAt.getTime() : Infinity;
        const timeB = b.lastSolveAt ? b.lastSolveAt.getTime() : Infinity;
        return timeA - timeB;
      });

    return allTeams.map((t, index) => ({
      rank: index + 1,
      teamId: t.id,
      teamName: t.name,
      totalScore: t.totalScore,
      solvesCount: memoryStore.solves.filter((s) => s.teamId === t.id).length,
      lastSolveAt: t.lastSolveAt ? t.lastSolveAt.toISOString() : null,
    }));
  },

  async getScoreboardTimeline(): Promise<any[]> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const solves = await prisma.solve.findMany({
        orderBy: { solvedAt: 'asc' },
        include: {
          team: true,
          challenge: true,
        },
      });

      const teamCumulative = new Map<string, number>();
      return solves.map((s) => {
        const cur = teamCumulative.get(s.teamId) || 0;
        const next = cur + s.pointsAwarded;
        teamCumulative.set(s.teamId, next);
        return {
          teamId: s.teamId,
          teamName: s.team.name,
          timestamp: s.solvedAt.toISOString(),
          score: next,
          challengeTitle: s.challenge.title,
        };
      });
    }

    const sortedSolves = [...memoryStore.solves].sort(
      (a, b) => a.solvedAt.getTime() - b.solvedAt.getTime()
    );
    const teamCumulative = new Map<string, number>();

    return sortedSolves.map((s) => {
      const cur = teamCumulative.get(s.teamId) || 0;
      const next = cur + s.pointsAwarded;
      teamCumulative.set(s.teamId, next);
      const team = memoryStore.teams.get(s.teamId);
      const chal = memoryStore.challenges.find((c) => c.id === s.challengeId);

      return {
        teamId: s.teamId,
        teamName: team?.name || 'Unknown',
        timestamp: s.solvedAt.toISOString(),
        score: next,
        challengeTitle: chal?.title || 'Unknown',
      };
    });
  },

  async getChallengeFlags(challengeId: string): Promise<string[]> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const flags = await prisma.flag.findMany({ where: { challengeId } });
      return flags.map((f) => f.flagHash);
    }
    const c = memoryStore.challenges.find((k) => k.id === challengeId);
    return c ? [c.flagHash] : [];
  },

  async unlockHint(teamId: string, hintId: string): Promise<{ success: boolean; content?: string }> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const hint = await prisma.hint.findUnique({ where: { id: hintId } });
      if (!hint) return { success: false };

      await prisma.$transaction(async (tx) => {
        await tx.hintUnlock.create({
          data: { teamId, hintId },
        });
        if (hint.cost > 0) {
          await tx.team.update({
            where: { id: teamId },
            data: { totalScore: { decrement: hint.cost } },
          });
        }
      });
      return { success: true, content: hint.content };
    }

    let targetHint: DBHint | undefined;
    for (const c of memoryStore.challenges) {
      const h = c.hints.find((item) => item.id === hintId);
      if (h) {
        targetHint = h;
        break;
      }
    }
    if (!targetHint) return { success: false };

    memoryStore.unlockedHints.add(`${teamId}:${hintId}`);
    const team = memoryStore.teams.get(teamId);
    if (team && targetHint.cost > 0) {
      team.totalScore = Math.max(0, team.totalScore - targetHint.cost);
    }
    return { success: true, content: targetHint.content };
  },
};
