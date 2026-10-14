import { prisma } from '../lib/prisma';
import { hashFlag } from '../utils/crypto';
import { Role, Difficulty, SessionStatus, TeamChallengeSessionDTO } from '@fossctf/shared';

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
  externalId?: string | null;
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
  isTimed: boolean;
  durationMinutes: number | null;
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

export interface DBTeamChallengeSession {
  id: string;
  teamId: string;
  challengeId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  startedAt: Date;
  expiresAt: Date;
  completedAt: Date | null;
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
  sessions: Map<string, DBTeamChallengeSession> = new Map(); // key: `${teamId}:${challengeId}`
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

    // Minimal development challenges: 1 untimed, 1 timed team challenge
    this.challenges = [
      {
        id: 'chal-dev-sample-1',
        slug: 'development-verification-challenge',
        title: 'Development Verification Challenge',
        description:
          'This is a development-only practice challenge to test the platform submission and scoring engine. In an active competition, real challenge briefs will be published here by contest coordinators.',
        categoryId: catMisc.id,
        difficulty: 'EASY',
        points: 100,
        isPublished: true,
        isTimed: false,
        durationMinutes: null,
        author: 'FOSS Platform Team',
        sortOrder: 1,
        flagHash: hashFlag('FOSSCTF{dev_verification_flag_2026}'),
        hints: [
          {
            id: 'hint-dev-1',
            challengeId: 'chal-dev-sample-1',
            content: 'The development verification flag is: FOSSCTF{dev_verification_flag_2026}',
            cost: 0,
            sortOrder: 1,
          },
        ],
      },
      {
        id: 'chal-timed-sample-2',
        slug: 'rapid-incident-response',
        title: 'Rapid Incident Response (Timed)',
        description:
          'A simulated security incident has been triggered. Any team member can start the challenge, initiating a shared 30-minute timer for the entire squad.\n\nAll teammates see the exact same deadline and synchronized remaining time.',
        categoryId: catWeb.id,
        difficulty: 'MEDIUM',
        points: 150,
        isPublished: true,
        isTimed: true,
        durationMinutes: 30,
        author: 'FOSS Security Squad',
        sortOrder: 2,
        flagHash: hashFlag('FOSSCTF{synchronized_team_session_2026}'),
        hints: [
          {
            id: 'hint-timed-1',
            challengeId: 'chal-timed-sample-2',
            content: 'Mitigation key: FOSSCTF{synchronized_team_session_2026}',
            cost: 0,
            sortOrder: 1,
          },
        ],
      },
    ];

    // Development user personas simulating external identity provider mapping
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
      username: 'charlie_solo',
      role: 'USER',
      teamId: null, // Test persona without any team
      createdAt: new Date(),
    };

    const userDave: DBUser = {
      id: 'usr-dave-05',
      email: 'dave@university.edu',
      username: 'dave_bravo',
      role: 'USER',
      teamId: 'team-null-pointers', // Member of Team 2
      createdAt: new Date(),
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(userAlice.id, userAlice);
    this.users.set(userBob.id, userBob);
    this.users.set(userCharlie.id, userCharlie);
    this.users.set(userDave.id, userDave);

    const team1: DBTeam = {
      id: 'team-binary-beasts',
      name: 'Binary Beasts',
      externalId: 'ext-team-alpha',
      totalScore: 0,
      lastSolveAt: null,
      members: [userAlice, userBob],
      createdAt: new Date(Date.now() - 86400000),
    };

    const team2: DBTeam = {
      id: 'team-null-pointers',
      name: 'Null Pointers',
      externalId: 'ext-team-bravo',
      totalScore: 0,
      lastSolveAt: null,
      members: [userDave],
      createdAt: new Date(Date.now() - 86400000),
    };

    this.teams.set(team1.id, team1);
    this.teams.set(team2.id, team2);

    this.solves = [];
    this.sessions = new Map();
  }
}

const memoryStore = new MemoryCTFStore();

let isPrismaAvailable: boolean | null = null;

async function checkPrisma(): Promise<boolean> {
  if (isPrismaAvailable !== null) return isPrismaAvailable;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000)),
    ]);
    isPrismaAvailable = true;
  } catch {
    isPrismaAvailable = false;
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
        externalId: t.externalId,
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
    t.members = Array.from(memoryStore.users.values()).filter((u) => u.teamId === t.id);
    return t;
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
        externalId: t.externalId,
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

  async listCategories(): Promise<DBCategory[]> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      return await prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
      });
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
          sessions: teamId ? { where: { teamId } } : false,
        },
        orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
      });

      const now = Date.now();
      return chals.map((c) => {
        const isSolvedByTeam = teamId ? c.solves.some((s) => s.teamId === teamId) : false;
        let sessionStatus: SessionStatus | undefined;
        if (c.isTimed && teamId) {
          if (isSolvedByTeam) {
            sessionStatus = 'COMPLETED';
          } else {
            const teamSession = Array.isArray(c.sessions) ? c.sessions[0] : null;
            if (!teamSession) {
              sessionStatus = 'NOT_STARTED';
            } else if (teamSession.status === 'COMPLETED') {
              sessionStatus = 'COMPLETED';
            } else if (teamSession.expiresAt.getTime() < now || teamSession.status === 'EXPIRED') {
              sessionStatus = 'EXPIRED';
            } else {
              sessionStatus = 'ACTIVE';
            }
          }
        }

        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          categoryId: c.categoryId,
          categoryName: c.category.name,
          difficulty: c.difficulty,
          points: c.points,
          solveCount: c.solves.length,
          isSolvedByTeam,
          isTimed: c.isTimed,
          durationMinutes: c.durationMinutes,
          sessionStatus,
          author: c.author,
        };
      });
    }

    const now = Date.now();
    return memoryStore.challenges.map((c) => {
      const cat = memoryStore.categories.find((k) => k.id === c.categoryId);
      const chSolves = memoryStore.solves.filter((s) => s.challengeId === c.id);
      const isSolvedByTeam = teamId ? chSolves.some((s) => s.teamId === teamId) : false;

      let sessionStatus: SessionStatus | undefined;
      if (c.isTimed && teamId) {
        if (isSolvedByTeam) {
          sessionStatus = 'COMPLETED';
        } else {
          const session = memoryStore.sessions.get(`${teamId}:${c.id}`);
          if (!session) {
            sessionStatus = 'NOT_STARTED';
          } else if (session.status === 'COMPLETED') {
            sessionStatus = 'COMPLETED';
          } else if (session.expiresAt.getTime() < now || session.status === 'EXPIRED') {
            sessionStatus = 'EXPIRED';
          } else {
            sessionStatus = 'ACTIVE';
          }
        }
      }

      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        categoryId: c.categoryId,
        categoryName: cat?.name || 'General',
        difficulty: c.difficulty,
        points: c.points,
        solveCount: chSolves.length,
        isSolvedByTeam,
        isTimed: c.isTimed,
        durationMinutes: c.durationMinutes,
        sessionStatus,
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

      let sessionDTO: TeamChallengeSessionDTO | null = null;
      if (c.isTimed && teamId) {
        sessionDTO = await this.getTeamChallengeSession(teamId, challengeId);
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
        isTimed: c.isTimed,
        durationMinutes: c.durationMinutes,
        session: sessionDTO,
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

    let sessionDTO: TeamChallengeSessionDTO | null = null;
    if (c.isTimed && teamId) {
      sessionDTO = await this.getTeamChallengeSession(teamId, challengeId);
    }

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
      isTimed: c.isTimed,
      durationMinutes: c.durationMinutes,
      session: sessionDTO,
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

  async getTeamChallengeSession(
    teamId: string,
    challengeId: string
  ): Promise<TeamChallengeSessionDTO | null> {
    const hasDb = await checkPrisma();
    const now = Date.now();

    if (hasDb) {
      const c = await prisma.challenge.findUnique({ where: { id: challengeId } });
      if (!c) return null;
      if (!c.isTimed) {
        return {
          challengeId,
          teamId,
          isTimed: false,
          status: 'NOT_STARTED',
          startedAt: null,
          expiresAt: null,
          completedAt: null,
          remainingSeconds: null,
        };
      }

      // Check if already solved
      const isSolved = await prisma.solve.findUnique({
        where: { teamId_challengeId: { teamId, challengeId } },
      });

      const session = await prisma.teamChallengeSession.findUnique({
        where: { teamId_challengeId: { teamId, challengeId } },
      });

      if (!session) {
        return {
          challengeId,
          teamId,
          isTimed: true,
          status: isSolved ? 'COMPLETED' : 'NOT_STARTED',
          startedAt: null,
          expiresAt: null,
          completedAt: null,
          remainingSeconds: null,
        };
      }

      let currentStatus: SessionStatus = session.status as SessionStatus;
      if (isSolved || currentStatus === 'COMPLETED') {
        currentStatus = 'COMPLETED';
      } else if (session.expiresAt.getTime() <= now) {
        currentStatus = 'EXPIRED';
        if (session.status !== 'EXPIRED') {
          await prisma.teamChallengeSession.update({
            where: { id: session.id },
            data: { status: 'EXPIRED' },
          });
        }
      }

      const remainingSeconds =
        currentStatus === 'ACTIVE'
          ? Math.max(0, Math.floor((session.expiresAt.getTime() - now) / 1000))
          : currentStatus === 'EXPIRED'
          ? 0
          : null;

      return {
        challengeId,
        teamId,
        isTimed: true,
        status: currentStatus,
        startedAt: session.startedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        completedAt: session.completedAt ? session.completedAt.toISOString() : null,
        remainingSeconds,
      };
    }

    const c = memoryStore.challenges.find((k) => k.id === challengeId);
    if (!c) return null;
    if (!c.isTimed) {
      return {
        challengeId,
        teamId,
        isTimed: false,
        status: 'NOT_STARTED',
        startedAt: null,
        expiresAt: null,
        completedAt: null,
        remainingSeconds: null,
      };
    }

    const isSolved = memoryStore.solves.some(
      (s) => s.teamId === teamId && s.challengeId === challengeId
    );

    const sessionKey = `${teamId}:${challengeId}`;
    const session = memoryStore.sessions.get(sessionKey);

    if (!session) {
      return {
        challengeId,
        teamId,
        isTimed: true,
        status: isSolved ? 'COMPLETED' : 'NOT_STARTED',
        startedAt: null,
        expiresAt: null,
        completedAt: null,
        remainingSeconds: null,
      };
    }

    let currentStatus: SessionStatus = session.status;
    if (isSolved || currentStatus === 'COMPLETED') {
      currentStatus = 'COMPLETED';
    } else if (session.expiresAt.getTime() <= now) {
      currentStatus = 'EXPIRED';
      session.status = 'EXPIRED';
    }

    const remainingSeconds =
      currentStatus === 'ACTIVE'
        ? Math.max(0, Math.floor((session.expiresAt.getTime() - now) / 1000))
        : currentStatus === 'EXPIRED'
        ? 0
        : null;

    return {
      challengeId,
      teamId,
      isTimed: true,
      status: currentStatus,
      startedAt: session.startedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      completedAt: session.completedAt ? session.completedAt.toISOString() : null,
      remainingSeconds,
    };
  },

  async startTeamChallengeSession(
    teamId: string,
    challengeId: string
  ): Promise<TeamChallengeSessionDTO> {
    const hasDb = await checkPrisma();
    const now = new Date();

    if (hasDb) {
      const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
      if (!challenge) {
        throw new Error('Challenge not found');
      }

      const durationMins = challenge.durationMinutes || 30;
      const expiresAt = new Date(now.getTime() + durationMins * 60 * 1000);

      // Atomic upsert/find to prevent race condition between teammates
      const session = await prisma.teamChallengeSession.upsert({
        where: { teamId_challengeId: { teamId, challengeId } },
        update: {}, // If it already exists, do NOT alter existing start or expiration!
        create: {
          teamId,
          challengeId,
          status: 'ACTIVE',
          startedAt: now,
          expiresAt,
        },
      });

      return (await this.getTeamChallengeSession(teamId, challengeId))!;
    }

    const challenge = memoryStore.challenges.find((k) => k.id === challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    const sessionKey = `${teamId}:${challengeId}`;
    let session = memoryStore.sessions.get(sessionKey);

    if (!session) {
      const durationMins = challenge.durationMinutes || 30;
      const expiresAt = new Date(now.getTime() + durationMins * 60 * 1000);

      session = {
        id: `sess-${Date.now()}`,
        teamId,
        challengeId,
        status: 'ACTIVE',
        startedAt: now,
        expiresAt,
        completedAt: null,
      };
      memoryStore.sessions.set(sessionKey, session);
    }

    return (await this.getTeamChallengeSession(teamId, challengeId))!;
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
    const now = new Date();

    if (hasDb) {
      return await prisma.$transaction(async (tx) => {
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
            lastSolveAt: now,
          },
        });

        // Mark shared challenge session as COMPLETED if active
        await tx.teamChallengeSession.updateMany({
          where: { teamId, challengeId },
          data: {
            status: 'COMPLETED',
            completedAt: now,
          },
        });

        return { isFirstBlood, pointsAwarded: points };
      });
    }

    const priorSolves = memoryStore.solves.filter((s) => s.challengeId === challengeId);
    const isFirstBlood = priorSolves.length === 0;

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

    // Mark shared session as completed
    const sessionKey = `${teamId}:${challengeId}`;
    const session = memoryStore.sessions.get(sessionKey);
    if (session) {
      session.status = 'COMPLETED';
      session.completedAt = now;
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
