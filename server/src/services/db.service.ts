import { prisma } from '../lib/prisma';
import { hashFlag } from '../utils/crypto';
import { config } from '../config/index';
import {
  Role,
  Difficulty,
  SessionStatus,
  TeamChallengeSessionDTO,
  AdminChallengeDTO,
  CreateChallengeRequest,
  UpdateChallengeRequest,
  CompetitionConfigDTO,
  UpdateCompetitionConfigRequest,
  CompetitionState,
  TeamSolveDTO,
  CompetitionAttemptDTO,
  AttemptStatus,
  CompetitionLeaderboardEntryDTO,
  CompetitionLeaderboardResponse,
  TimedAttemptStatus,
  formatElapsedDuration,
} from '@fossctf/shared';

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
  valenfindTeamId?: string | null;
  totalScore: number;
  lastSolveAt: Date | null;
  members: DBUser[];
  solvesCount?: number;
  totalAvailableChallenges?: number;
  solves?: TeamSolveDTO[];
  rank?: number;
  createdAt: Date;
}

export interface DBCompetitionConfig {
  id: string;
  title: string;
  description: string;
  startTime: Date | null;
  endTime: Date | null;
  isPaused: boolean;
  updatedAt: Date;
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
  isArchived: boolean;
  isTimed: boolean;
  durationMinutes: number | null;
  author: string | null;
  sortOrder: number;
  flagHash: string;
  hints: DBHint[];
  createdAt: Date;
  updatedAt: Date;
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

export interface DBCompetitionAttempt {
  id: string;
  teamId: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: Date;
  completedAt: Date | null;
  elapsedMs: number | null;
  createdAt: Date;
  updatedAt: Date;
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
  attempts: Map<string, DBCompetitionAttempt> = new Map(); // key: teamId
  unlockedHints: Set<string> = new Set(); // "teamId:hintId"
  competitionConfig: DBCompetitionConfig = {
    id: 'main',
    title: 'FOSS CTF 2026',
    description: 'Official University Capture The Flag Competition organized by FOSS Club.',
    startTime: null,
    endTime: null,
    isPaused: false,
    updatedAt: new Date(),
  };

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
        isArchived: false,
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
        createdAt: new Date(),
        updatedAt: new Date(),
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
        isArchived: false,
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
        createdAt: new Date(),
        updatedAt: new Date(),
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
      valenfindTeamId: 'e4e8c7ee-8a3c-49f7-a23a-1fbf9d3e386a', // Mapped to Valenfind Team Alpha
      totalScore: 0,
      lastSolveAt: null,
      members: [userAlice, userBob],
      createdAt: new Date(Date.now() - 86400000),
    };

    const team2: DBTeam = {
      id: 'team-null-pointers',
      name: 'Null Pointers',
      externalId: 'ext-team-bravo',
      valenfindTeamId: 'c9f758bf-077b-4516-89aa-a5b3778ef9e2', // Mapped to Valenfind Team Bravo
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
        include: {
          members: true,
          solves: {
            include: {
              challenge: {
                include: { category: true },
              },
            },
            orderBy: { solvedAt: 'desc' },
          },
        },
      });
      if (!t) return null;

      const publishedSolves = t.solves.filter((s) => s.challenge.isPublished);
      const totalScore = publishedSolves.reduce((sum, s) => sum + s.pointsAwarded, 0);
      const totalAvailable = await prisma.challenge.count({
        where: { isPublished: true, isArchived: false },
      });

      const scoreboard = await this.getScoreboard();
      const rankEntry = scoreboard.find((entry) => entry.teamId === t.id);

      return {
        id: t.id,
        name: t.name,
        externalId: t.externalId,
        valenfindTeamId: (t as any).valenfindTeamId ?? null,
        totalScore,
        lastSolveAt: t.lastSolveAt,
        solvesCount: publishedSolves.length,
        totalAvailableChallenges: totalAvailable,
        rank: rankEntry ? rankEntry.rank : undefined,
        solves: publishedSolves.map((s) => ({
          challengeId: s.challengeId,
          challengeTitle: s.challenge.title,
          categoryName: s.challenge.category.name,
          pointsAwarded: s.pointsAwarded,
          solvedAt: s.solvedAt.toISOString(),
          isFirstBlood: s.isFirstBlood,
        })),
        members: t.members.map((m) => ({
          id: m.id,
          username: m.username,
          email: m.email,
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

    const teamSolves = memoryStore.solves.filter((s) => s.teamId === t.id);
    const publishedSolves = teamSolves
      .map((s) => {
        const chal = memoryStore.challenges.find((c) => c.id === s.challengeId);
        if (!chal || !chal.isPublished) return null;
        const cat = memoryStore.categories.find((c) => c.id === chal.categoryId);
        return {
          challengeId: s.challengeId,
          challengeTitle: chal.title,
          categoryName: cat?.name || 'General',
          pointsAwarded: s.pointsAwarded,
          solvedAt: s.solvedAt.toISOString(),
          isFirstBlood: s.isFirstBlood,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const totalScore = publishedSolves.reduce((sum, s) => sum + s.pointsAwarded, 0);
    const totalAvailable = memoryStore.challenges.filter(
      (c) => c.isPublished && !c.isArchived
    ).length;

    const scoreboard = await this.getScoreboard();
    const rankEntry = scoreboard.find((entry) => entry.teamId === t.id);

    return {
      id: t.id,
      name: t.name,
      externalId: t.externalId,
      valenfindTeamId: t.valenfindTeamId ?? null,
      totalScore,
      lastSolveAt: t.lastSolveAt,
      solvesCount: publishedSolves.length,
      totalAvailableChallenges: totalAvailable,
      rank: rankEntry ? rankEntry.rank : undefined,
      solves: publishedSolves,
      members: t.members.map((m) => ({
        id: m.id,
        username: m.username,
        email: m.email,
        role: m.role as Role,
        teamId: m.teamId,
        createdAt: m.createdAt,
      })),
      createdAt: t.createdAt,
    };
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
        where: { isPublished: true, isArchived: false },
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
            } else if (now > teamSession.expiresAt.getTime() || teamSession.status === 'EXPIRED') {
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
    return memoryStore.challenges
      .filter((c) => c.isPublished && !c.isArchived)
      .map((c) => {
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
            } else if (now > session.expiresAt.getTime() || session.status === 'EXPIRED') {
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
        isPublished: c.isPublished,
        isArchived: c.isArchived,
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
      isPublished: c.isPublished,
      isArchived: c.isArchived,
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
      } else if (now > session.expiresAt.getTime()) {
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
          ? Math.max(0, Math.ceil((session.expiresAt.getTime() - now) / 1000))
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
    } else if (now > session.expiresAt.getTime()) {
      currentStatus = 'EXPIRED';
      session.status = 'EXPIRED';
    }

    const remainingSeconds =
      currentStatus === 'ACTIVE'
        ? Math.max(0, Math.ceil((session.expiresAt.getTime() - now) / 1000))
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
      if (!challenge || !challenge.isPublished) {
        throw new Error('Challenge not found');
      }
      if (challenge.isArchived) {
        throw new Error('Challenge is archived and cannot be started');
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
    if (!challenge || !challenge.isPublished) {
      throw new Error('Challenge not found');
    }
    if (challenge.isArchived) {
      throw new Error('Challenge is archived and cannot be started');
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
        include: {
          solves: {
            select: {
              pointsAwarded: true,
              solvedAt: true,
            },
          },
        },
      });

      const calculated = teams
        .map((t) => {
          const totalScore = t.solves.reduce((sum, s) => sum + s.pointsAwarded, 0);
          const solvesCount = t.solves.length;
          let lastSolveAt: Date | null = null;
          if (t.solves.length > 0) {
            lastSolveAt = new Date(Math.max(...t.solves.map((s) => s.solvedAt.getTime())));
          }
          return {
            teamId: t.id,
            teamName: t.name,
            totalScore,
            solvesCount,
            lastSolveAt,
          };
        })
        .filter((t) => t.totalScore > 0)
        .sort((a, b) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          const timeA = a.lastSolveAt ? a.lastSolveAt.getTime() : Infinity;
          const timeB = b.lastSolveAt ? b.lastSolveAt.getTime() : Infinity;
          if (timeA !== timeB) return timeA - timeB;
          return a.teamId.localeCompare(b.teamId);
        });

      return calculated.map((t, index) => ({
        rank: index + 1,
        teamId: t.teamId,
        teamName: t.teamName,
        totalScore: t.totalScore,
        solvesCount: t.solvesCount,
        lastSolveAt: t.lastSolveAt ? t.lastSolveAt.toISOString() : null,
      }));
    }

    const calculated = Array.from(memoryStore.teams.values())
      .map((t) => {
        const teamSolves = memoryStore.solves.filter((s) => s.teamId === t.id);
        const totalScore = teamSolves.reduce((sum, s) => sum + s.pointsAwarded, 0);
        const solvesCount = teamSolves.length;
        let lastSolveAt: Date | null = null;
        if (teamSolves.length > 0) {
          lastSolveAt = new Date(Math.max(...teamSolves.map((s) => s.solvedAt.getTime())));
        }
        return {
          teamId: t.id,
          teamName: t.name,
          totalScore,
          solvesCount,
          lastSolveAt,
        };
      })
      .filter((t) => t.totalScore > 0)
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        const timeA = a.lastSolveAt ? a.lastSolveAt.getTime() : Infinity;
        const timeB = b.lastSolveAt ? b.lastSolveAt.getTime() : Infinity;
        if (timeA !== timeB) return timeA - timeB;
        return a.teamId.localeCompare(b.teamId);
      });

    return calculated.map((t, index) => ({
      rank: index + 1,
      teamId: t.teamId,
      teamName: t.teamName,
      totalScore: t.totalScore,
      solvesCount: t.solvesCount,
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

  /**
   * Admin Operations for Challenge Engine
   */
  async listAdminChallenges(): Promise<AdminChallengeDTO[]> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const chals = await prisma.challenge.findMany({
        include: {
          category: true,
          flags: true,
          solves: true,
        },
        orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
      });

      return chals.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        categoryId: c.categoryId,
        categoryName: c.category.name,
        difficulty: c.difficulty as Difficulty,
        points: c.points,
        isPublished: c.isPublished,
        isArchived: c.isArchived,
        isTimed: c.isTimed,
        durationMinutes: c.durationMinutes,
        author: c.author,
        sortOrder: c.sortOrder,
        hasFlag: c.flags.length > 0,
        flagCount: c.flags.length,
        solveCount: c.solves.length,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }));
    }

    return memoryStore.challenges.map((c) => {
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
        isPublished: c.isPublished,
        isArchived: c.isArchived,
        isTimed: c.isTimed,
        durationMinutes: c.durationMinutes,
        author: c.author,
        sortOrder: c.sortOrder,
        hasFlag: Boolean(c.flagHash),
        flagCount: c.flagHash ? 1 : 0,
        solveCount: chSolves.length,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });
  },

  async getAdminChallenge(id: string): Promise<AdminChallengeDTO | null> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const c = await prisma.challenge.findUnique({
        where: { id },
        include: {
          category: true,
          flags: true,
          solves: true,
        },
      });
      if (!c) return null;
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        categoryId: c.categoryId,
        categoryName: c.category.name,
        difficulty: c.difficulty as Difficulty,
        points: c.points,
        isPublished: c.isPublished,
        isArchived: c.isArchived,
        isTimed: c.isTimed,
        durationMinutes: c.durationMinutes,
        author: c.author,
        sortOrder: c.sortOrder,
        hasFlag: c.flags.length > 0,
        flagCount: c.flags.length,
        solveCount: c.solves.length,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    }

    const c = memoryStore.challenges.find((k) => k.id === id);
    if (!c) return null;
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
      isPublished: c.isPublished,
      isArchived: c.isArchived,
      isTimed: c.isTimed,
      durationMinutes: c.durationMinutes,
      author: c.author,
      sortOrder: c.sortOrder,
      hasFlag: Boolean(c.flagHash),
      flagCount: c.flagHash ? 1 : 0,
      solveCount: chSolves.length,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  },

  async createChallenge(data: CreateChallengeRequest): Promise<AdminChallengeDTO> {
    if (data.points <= 0) {
      throw new Error('Point value must be greater than 0');
    }
    if (data.isTimed && (!data.durationMinutes || data.durationMinutes <= 0)) {
      throw new Error('Timed challenges must specify a positive duration in minutes');
    }

    const slug = data.slug?.trim() || slugify(data.title);
    const hashed = hashFlag(data.flag);
    const now = new Date();

    const hasDb = await checkPrisma();
    if (hasDb) {
      const created = await prisma.$transaction(async (tx) => {
        const c = await tx.challenge.create({
          data: {
            title: data.title.trim(),
            slug,
            description: data.description,
            categoryId: data.categoryId,
            difficulty: data.difficulty,
            points: data.points,
            isPublished: data.isPublished || false,
            isArchived: data.isArchived || false,
            isTimed: data.isTimed || false,
            durationMinutes: data.isTimed ? data.durationMinutes || 30 : null,
            author: data.author || null,
            sortOrder: 0,
          },
          include: { category: true },
        });

        await tx.flag.create({
          data: {
            challengeId: c.id,
            flagHash: hashed,
            isCaseSensitive: true,
          },
        });

        return c;
      });

      return {
        id: created.id,
        slug: created.slug,
        title: created.title,
        description: created.description,
        categoryId: created.categoryId,
        categoryName: created.category.name,
        difficulty: created.difficulty as Difficulty,
        points: created.points,
        isPublished: created.isPublished,
        isArchived: created.isArchived,
        isTimed: created.isTimed,
        durationMinutes: created.durationMinutes,
        author: created.author,
        sortOrder: created.sortOrder,
        hasFlag: true,
        flagCount: 1,
        solveCount: 0,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    }

    const newId = `chal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newChallenge: DBChallenge = {
      id: newId,
      slug,
      title: data.title.trim(),
      description: data.description,
      categoryId: data.categoryId,
      difficulty: data.difficulty,
      points: data.points,
      isPublished: data.isPublished || false,
      isArchived: data.isArchived || false,
      isTimed: data.isTimed || false,
      durationMinutes: data.isTimed ? data.durationMinutes || 30 : null,
      author: data.author || null,
      sortOrder: 0,
      flagHash: hashed,
      hints: [],
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.challenges.push(newChallenge);
    const cat = memoryStore.categories.find((k) => k.id === data.categoryId);

    return {
      id: newChallenge.id,
      slug: newChallenge.slug,
      title: newChallenge.title,
      description: newChallenge.description,
      categoryId: newChallenge.categoryId,
      categoryName: cat?.name || 'General',
      difficulty: newChallenge.difficulty,
      points: newChallenge.points,
      isPublished: newChallenge.isPublished,
      isArchived: newChallenge.isArchived,
      isTimed: newChallenge.isTimed,
      durationMinutes: newChallenge.durationMinutes,
      author: newChallenge.author,
      sortOrder: newChallenge.sortOrder,
      hasFlag: true,
      flagCount: 1,
      solveCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  },

  async updateChallenge(id: string, data: UpdateChallengeRequest): Promise<AdminChallengeDTO> {
    if (data.points !== undefined && data.points <= 0) {
      throw new Error('Point value must be greater than 0');
    }
    if (
      data.isTimed &&
      data.durationMinutes !== undefined &&
      (data.durationMinutes === null || data.durationMinutes <= 0)
    ) {
      throw new Error('Timed challenges must specify a positive duration in minutes');
    }

    const now = new Date();
    const hasDb = await checkPrisma();
    if (hasDb) {
      const existing = await prisma.challenge.findUnique({ where: { id } });
      if (!existing) throw new Error('Challenge not found');

      const isTimedFinal = data.isTimed !== undefined ? data.isTimed : existing.isTimed;
      const durationFinal = isTimedFinal
        ? data.durationMinutes !== undefined
          ? data.durationMinutes
          : existing.durationMinutes
        : null;

      const updated = await prisma.challenge.update({
        where: { id },
        data: {
          title: data.title !== undefined ? data.title.trim() : undefined,
          slug: data.slug !== undefined ? data.slug.trim() : undefined,
          description: data.description,
          categoryId: data.categoryId,
          difficulty: data.difficulty,
          points: data.points,
          isPublished: data.isPublished,
          isArchived: data.isArchived,
          isTimed: data.isTimed,
          durationMinutes: durationFinal,
          author: data.author,
          sortOrder: data.sortOrder,
        },
        include: {
          category: true,
          flags: true,
          solves: true,
        },
      });

      return {
        id: updated.id,
        slug: updated.slug,
        title: updated.title,
        description: updated.description,
        categoryId: updated.categoryId,
        categoryName: updated.category.name,
        difficulty: updated.difficulty as Difficulty,
        points: updated.points,
        isPublished: updated.isPublished,
        isArchived: updated.isArchived,
        isTimed: updated.isTimed,
        durationMinutes: updated.durationMinutes,
        author: updated.author,
        sortOrder: updated.sortOrder,
        hasFlag: updated.flags.length > 0,
        flagCount: updated.flags.length,
        solveCount: updated.solves.length,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    const c = memoryStore.challenges.find((k) => k.id === id);
    if (!c) throw new Error('Challenge not found');

    if (data.title !== undefined) c.title = data.title.trim();
    if (data.slug !== undefined) c.slug = data.slug.trim();
    if (data.description !== undefined) c.description = data.description;
    if (data.categoryId !== undefined) c.categoryId = data.categoryId;
    if (data.difficulty !== undefined) c.difficulty = data.difficulty;
    if (data.points !== undefined) c.points = data.points;
    if (data.isPublished !== undefined) c.isPublished = data.isPublished;
    if (data.isArchived !== undefined) c.isArchived = data.isArchived;
    if (data.isTimed !== undefined) c.isTimed = data.isTimed;
    if (data.durationMinutes !== undefined) c.durationMinutes = data.durationMinutes;
    if (data.author !== undefined) c.author = data.author;
    if (data.sortOrder !== undefined) c.sortOrder = data.sortOrder;
    c.updatedAt = now;

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
      isPublished: c.isPublished,
      isArchived: c.isArchived,
      isTimed: c.isTimed,
      durationMinutes: c.durationMinutes,
      author: c.author,
      sortOrder: c.sortOrder,
      hasFlag: Boolean(c.flagHash),
      flagCount: c.flagHash ? 1 : 0,
      solveCount: chSolves.length,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  },

  async publishChallenge(id: string): Promise<AdminChallengeDTO> {
    return this.updateChallenge(id, { isPublished: true, isArchived: false });
  },

  async unpublishChallenge(id: string): Promise<AdminChallengeDTO> {
    return this.updateChallenge(id, { isPublished: false });
  },

  async archiveChallenge(id: string): Promise<AdminChallengeDTO> {
    return this.updateChallenge(id, { isArchived: true });
  },

  async updateChallengeFlag(
    id: string,
    flag: string,
    isCaseSensitive: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    if (!flag || !flag.trim()) {
      throw new Error('Flag cannot be empty');
    }
    const hashed = hashFlag(flag, isCaseSensitive);

    const hasDb = await checkPrisma();
    if (hasDb) {
      const existing = await prisma.challenge.findUnique({ where: { id } });
      if (!existing) throw new Error('Challenge not found');

      const existingFlag = await prisma.flag.findFirst({ where: { challengeId: id } });
      if (existingFlag) {
        await prisma.flag.update({
          where: { id: existingFlag.id },
          data: { flagHash: hashed, isCaseSensitive },
        });
      } else {
        await prisma.flag.create({
          data: { challengeId: id, flagHash: hashed, isCaseSensitive },
        });
      }
      return { success: true, message: 'Challenge flag updated successfully' };
    }

    const c = memoryStore.challenges.find((k) => k.id === id);
    if (!c) throw new Error('Challenge not found');

    // Historical solves and scores survive flag rotation intact
    c.flagHash = hashed;
    c.updatedAt = new Date();
    return { success: true, message: 'Challenge flag updated successfully' };
  },

  async deleteChallenge(id: string): Promise<{ success: boolean; message: string }> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const solvesCount = await prisma.solve.count({ where: { challengeId: id } });
      const submissionsCount = await prisma.submission.count({ where: { challengeId: id } });
      const sessionsCount = await prisma.teamChallengeSession.count({ where: { challengeId: id } });

      if (solvesCount > 0 || submissionsCount > 0 || sessionsCount > 0) {
        throw new Error(
          'Cannot delete challenge with existing solves, submissions, or active sessions. Please archive it instead.'
        );
      }

      await prisma.challenge.delete({ where: { id } });
      return { success: true, message: 'Challenge deleted successfully' };
    }

    const chIndex = memoryStore.challenges.findIndex((k) => k.id === id);
    if (chIndex === -1) throw new Error('Challenge not found');

    const solvesCount = memoryStore.solves.filter((s) => s.challengeId === id).length;
    let sessionsCount = 0;
    for (const session of memoryStore.sessions.values()) {
      if (session.challengeId === id) sessionsCount++;
    }

    if (solvesCount > 0 || sessionsCount > 0) {
      throw new Error(
        'Cannot delete challenge with existing solves, submissions, or active sessions. Please archive it instead.'
      );
    }

    memoryStore.challenges.splice(chIndex, 1);
    return { success: true, message: 'Challenge deleted successfully' };
  },

  /**
   * Competition Lifecycle & Engine Management
   */
  async getCompetitionConfig(): Promise<CompetitionConfigDTO> {
    const hasDb = await checkPrisma();
    const now = Date.now();

    if (hasDb) {
      const record = await prisma.competitionConfig.findUnique({
        where: { key: 'competition' },
      });

      if (record) {
        try {
          const parsed = JSON.parse(record.value);
          const startTime = parsed.startTime ? new Date(parsed.startTime) : null;
          const endTime = parsed.endTime ? new Date(parsed.endTime) : null;
          const isPaused = Boolean(parsed.isPaused);

          let status: CompetitionState = 'LIVE';
          if (isPaused) {
            status = 'PAUSED';
          } else if (startTime && now < startTime.getTime()) {
            status = 'SCHEDULED';
          } else if (endTime && now > endTime.getTime()) {
            status = 'ENDED';
          }

          return {
            id: 'main',
            title: parsed.title || 'FOSS CTF 2026',
            description: parsed.description || 'Official University Capture The Flag Competition.',
            startTime: startTime ? startTime.toISOString() : null,
            endTime: endTime ? endTime.toISOString() : null,
            isPaused,
            state: status,
            status,
            serverTime: new Date(now).toISOString(),
          };
        } catch {
          // fallback if corrupt
        }
      }

      // Default when not yet configured
      const isDev = config.isDev;
      const defaultStatus: CompetitionState = isDev ? 'LIVE' : 'DRAFT';
      return {
        id: 'main',
        title: 'FOSS CTF 2026',
        description: 'Official University Capture The Flag Competition organized by FOSS Club.',
        startTime: null,
        endTime: null,
        isPaused: !isDev,
        state: defaultStatus,
        status: defaultStatus,
        serverTime: new Date(now).toISOString(),
      };
    }

    // Memory Store fallback
    const cfg = memoryStore.competitionConfig;
    let status: CompetitionState = 'LIVE';
    if (cfg.isPaused) {
      status = 'PAUSED';
    } else if (cfg.startTime && now < cfg.startTime.getTime()) {
      status = 'SCHEDULED';
    } else if (cfg.endTime && now > cfg.endTime.getTime()) {
      status = 'ENDED';
    }

    return {
      id: cfg.id,
      title: cfg.title,
      description: cfg.description,
      startTime: cfg.startTime ? cfg.startTime.toISOString() : null,
      endTime: cfg.endTime ? cfg.endTime.toISOString() : null,
      isPaused: cfg.isPaused,
      state: status,
      status,
      serverTime: new Date(now).toISOString(),
    };
  },

  async updateCompetitionConfig(data: UpdateCompetitionConfigRequest): Promise<CompetitionConfigDTO> {
    const hasDb = await checkPrisma();
    const current = await this.getCompetitionConfig();

    const title = data.title !== undefined ? data.title.trim() : current.title;
    const description = data.description !== undefined ? data.description.trim() : current.description;
    const startTimeStr = data.startTime !== undefined ? data.startTime : current.startTime;
    const endTimeStr = data.endTime !== undefined ? data.endTime : current.endTime;
    const isPaused = data.isPaused !== undefined ? data.isPaused : current.isPaused;

    const startTime = startTimeStr ? new Date(startTimeStr) : null;
    const endTime = endTimeStr ? new Date(endTimeStr) : null;

    if (startTime && endTime && endTime.getTime() <= startTime.getTime()) {
      throw new Error('End time must be after start time');
    }

    const now = Date.now();
    let status: CompetitionState = 'LIVE';
    if (isPaused) {
      status = 'PAUSED';
    } else if (startTime && now < startTime.getTime()) {
      status = 'SCHEDULED';
    } else if (endTime && now > endTime.getTime()) {
      status = 'ENDED';
    }

    const payload = {
      title,
      description,
      startTime: startTime ? startTime.toISOString() : null,
      endTime: endTime ? endTime.toISOString() : null,
      isPaused,
    };

    if (hasDb) {
      await prisma.competitionConfig.upsert({
        where: { key: 'competition' },
        create: {
          key: 'competition',
          value: JSON.stringify(payload),
        },
        update: {
          value: JSON.stringify(payload),
        },
      });

      return {
        id: 'main',
        ...payload,
        state: status,
        status,
        serverTime: new Date(now).toISOString(),
      };
    }

    memoryStore.competitionConfig = {
      id: 'main',
      title,
      description,
      startTime,
      endTime,
      isPaused,
      updatedAt: new Date(now),
    };

    return {
      id: 'main',
      ...payload,
      state: status,
      status,
      serverTime: new Date(now).toISOString(),
    };
  },

  /**
   * Timed Competition Attempt Management
   */
  async getCompetitionAttempt(teamId: string): Promise<CompetitionAttemptDTO | null> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      const attempt = await prisma.competitionAttempt.findUnique({
        where: { teamId },
      });
      if (!attempt) return null;
      return {
        id: attempt.id,
        teamId: attempt.teamId,
        status: attempt.status as AttemptStatus,
        startedAt: attempt.startedAt.toISOString(),
        completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
        elapsedMs: attempt.elapsedMs,
        createdAt: attempt.createdAt.toISOString(),
        updatedAt: attempt.updatedAt.toISOString(),
      };
    }

    const attempt = memoryStore.attempts.get(teamId);
    if (!attempt) return null;
    return {
      id: attempt.id,
      teamId: attempt.teamId,
      status: attempt.status as AttemptStatus,
      startedAt: attempt.startedAt.toISOString(),
      completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
      elapsedMs: attempt.elapsedMs,
      createdAt: attempt.createdAt.toISOString(),
      updatedAt: attempt.updatedAt.toISOString(),
    };
  },

  async startCompetitionAttempt(teamId: string): Promise<CompetitionAttemptDTO> {
    // 1. Enforce competition lifecycle rules
    const compConfig = await this.getCompetitionConfig();
    if (compConfig.status === 'PAUSED' || compConfig.status === 'DRAFT') {
      const err = new Error('The competition is currently not accepting attempts.');
      (err as any).code = 'COMPETITION_INACTIVE';
      throw err;
    }
    if (compConfig.status === 'SCHEDULED') {
      const err = new Error('The competition has not started yet. Attempts cannot be started.');
      (err as any).code = 'COMPETITION_SCHEDULED';
      throw err;
    }
    if (compConfig.status === 'ENDED') {
      const err = new Error('The competition has ended. Attempts can no longer be started.');
      (err as any).code = 'COMPETITION_ENDED';
      throw err;
    }

    const hasDb = await checkPrisma();
    const now = new Date();

    if (hasDb) {
      // Atomic upsert: If an attempt already exists, update nothing and return the existing attempt!
      await prisma.competitionAttempt.upsert({
        where: { teamId },
        update: {}, // Preserve existing startedAt, status, completedAt, etc.
        create: {
          teamId,
          status: 'IN_PROGRESS',
          startedAt: now,
        },
      });

      return (await this.getCompetitionAttempt(teamId))!;
    }

    let attempt = memoryStore.attempts.get(teamId);
    if (!attempt) {
      attempt = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        teamId,
        status: 'IN_PROGRESS',
        startedAt: now,
        completedAt: null,
        elapsedMs: null,
        createdAt: now,
        updatedAt: now,
      };
      memoryStore.attempts.set(teamId, attempt);
    }

    return (await this.getCompetitionAttempt(teamId))!;
  },

  async completeCompetitionAttempt(teamId: string): Promise<CompetitionAttemptDTO> {
    const hasDb = await checkPrisma();
    const now = new Date();

    if (hasDb) {
      const existing = await prisma.competitionAttempt.findUnique({
        where: { teamId },
      });

      if (!existing) {
        const err = new Error('Competition attempt not found for this team.');
        (err as any).code = 'ATTEMPT_NOT_FOUND';
        throw err;
      }

      // If already completed, idempotent return without modifying completedAt or elapsedMs!
      if (existing.status === 'COMPLETED') {
        return (await this.getCompetitionAttempt(teamId))!;
      }

      const elapsedMs = Math.max(0, now.getTime() - existing.startedAt.getTime());

      // Concurrency protection: update only if status is still IN_PROGRESS
      await prisma.competitionAttempt.updateMany({
        where: {
          teamId,
          status: 'IN_PROGRESS',
        },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          elapsedMs,
        },
      });

      return (await this.getCompetitionAttempt(teamId))!;
    }

    const attempt = memoryStore.attempts.get(teamId);
    if (!attempt) {
      const err = new Error('Competition attempt not found for this team.');
      (err as any).code = 'ATTEMPT_NOT_FOUND';
      throw err;
    }

    if (attempt.status === 'COMPLETED') {
      return (await this.getCompetitionAttempt(teamId))!;
    }

    const elapsedMs = Math.max(0, now.getTime() - attempt.startedAt.getTime());
    attempt.status = 'COMPLETED';
    attempt.completedAt = now;
    attempt.elapsedMs = elapsedMs;
    attempt.updatedAt = now;

    return (await this.getCompetitionAttempt(teamId))!;
  },

  /**
   * Sets or clears the mapped Valenfind team ID for a CTF team.
   */
  async updateTeamValenfindId(teamId: string, valenfindTeamId: string | null): Promise<void> {
    const hasDb = await checkPrisma();
    if (hasDb) {
      await prisma.team.update({
        where: { id: teamId },
        data: { valenfindTeamId },
      });
      return;
    }

    const team = memoryStore.teams.get(teamId);
    if (team) {
      team.valenfindTeamId = valenfindTeamId;
    }
  },

  /**
   * Retrieves the dedicated timed competition leaderboard.
   * Ranks all eligible teams:
   * 1. Completed teams rank above incomplete teams.
   * 2. Completed teams rank by elapsedMs ascending (faster is better).
   * 3. For equal elapsedMs, completedAt ascending (earlier finish is better).
   * 4. Stable teamId ascending as the final deterministic tie-breaker.
   * 5. Incomplete teams appear after completed teams (IN_PROGRESS before NOT_STARTED,
   *    sorted by startedAt ascending, then teamId).
   * 6. No fake completion times or elapsedMs are generated for incomplete teams.
   */
  async getCompetitionLeaderboard(): Promise<CompetitionLeaderboardResponse> {
    const hasDb = await checkPrisma();

    interface RawTeamAttempt {
      teamId: string;
      teamName: string;
      attempt?: {
        status: string;
        startedAt: Date;
        completedAt: Date | null;
        elapsedMs: number | null;
      } | null;
    }

    let rawTeams: RawTeamAttempt[] = [];

    if (hasDb) {
      const teams = await prisma.team.findMany({
        select: {
          id: true,
          name: true,
          attempts: {
            take: 1,
            select: {
              status: true,
              startedAt: true,
              completedAt: true,
              elapsedMs: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      rawTeams = teams.map((t) => ({
        teamId: t.id,
        teamName: t.name,
        attempt: t.attempts[0] || null,
      }));
    } else {
      rawTeams = Array.from(memoryStore.teams.values()).map((t) => {
        const attempt = memoryStore.attempts.get(t.id);
        return {
          teamId: t.id,
          teamName: t.name,
          attempt: attempt || null,
        };
      });
    }

    // Map each team to its entry
    const entries: Array<Omit<CompetitionLeaderboardEntryDTO, 'rank'>> = rawTeams.map((t) => {
      const att = t.attempt;
      if (att && att.status === 'COMPLETED') {
        const elapsed =
          att.elapsedMs ??
          (att.completedAt
            ? Math.max(0, new Date(att.completedAt).getTime() - new Date(att.startedAt).getTime())
            : null);
        return {
          teamId: t.teamId,
          teamName: t.teamName,
          status: 'COMPLETED' as TimedAttemptStatus,
          elapsedMs: elapsed,
          formattedTime: formatElapsedDuration(elapsed),
          startedAt: new Date(att.startedAt).toISOString(),
          completedAt: att.completedAt ? new Date(att.completedAt).toISOString() : null,
        };
      }

      if (att && att.status === 'IN_PROGRESS') {
        return {
          teamId: t.teamId,
          teamName: t.teamName,
          status: 'IN_PROGRESS' as TimedAttemptStatus,
          elapsedMs: null,
          formattedTime: null,
          startedAt: new Date(att.startedAt).toISOString(),
          completedAt: null,
        };
      }

      return {
        teamId: t.teamId,
        teamName: t.teamName,
        status: 'NOT_STARTED' as TimedAttemptStatus,
        elapsedMs: null,
        formattedTime: null,
        startedAt: null,
        completedAt: null,
      };
    });

    const completedTeams = entries.filter((e) => e.status === 'COMPLETED');
    const incompleteTeams = entries.filter((e) => e.status !== 'COMPLETED');

    // Sort completed teams:
    // 1. elapsedMs ASC
    // 2. completedAt ASC
    // 3. teamId ASC (deterministic tie-breaker)
    completedTeams.sort((a, b) => {
      const elapsedA = a.elapsedMs ?? Infinity;
      const elapsedB = b.elapsedMs ?? Infinity;
      if (elapsedA !== elapsedB) {
        return elapsedA - elapsedB;
      }
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : Infinity;
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : Infinity;
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return a.teamId.localeCompare(b.teamId);
    });

    // Sort incomplete teams:
    // 1. IN_PROGRESS before NOT_STARTED
    // 2. startedAt ASC
    // 3. teamName ASC or teamId ASC (deterministic)
    incompleteTeams.sort((a, b) => {
      if (a.status === 'IN_PROGRESS' && b.status === 'NOT_STARTED') return -1;
      if (a.status === 'NOT_STARTED' && b.status === 'IN_PROGRESS') return 1;

      if (a.status === 'IN_PROGRESS' && b.status === 'IN_PROGRESS') {
        const startA = a.startedAt ? new Date(a.startedAt).getTime() : Infinity;
        const startB = b.startedAt ? new Date(b.startedAt).getTime() : Infinity;
        if (startA !== startB) return startA - startB;
      }

      return a.teamName.localeCompare(b.teamName) || a.teamId.localeCompare(b.teamId);
    });

    const sorted = [...completedTeams, ...incompleteTeams];
    const rankedLeaderboard: CompetitionLeaderboardEntryDTO[] = sorted.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return {
      leaderboard: rankedLeaderboard,
      totalTeams: rankedLeaderboard.length,
      completedCount: completedTeams.length,
      inProgressCount: incompleteTeams.filter((e) => e.status === 'IN_PROGRESS').length,
      notStartedCount: incompleteTeams.filter((e) => e.status === 'NOT_STARTED').length,
      updatedAt: new Date().toISOString(),
    };
  },
};

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `chal-${Date.now()}`;
}
