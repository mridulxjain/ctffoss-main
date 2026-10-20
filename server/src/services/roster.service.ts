import { prisma } from '../lib/prisma';
import {
  APPROVED_TEAMS,
  APPROVED_ROSTER,
  ApprovedTeam,
  ApprovedRosterMember,
} from '../fixtures/approvedRoster';

export type TeamMatchStatus = 'MATCH' | 'NOT_FOUND' | 'AMBIGUOUS';

export interface TeamMatchResult {
  status: TeamMatchStatus;
  team?: ApprovedTeam;
  member?: ApprovedRosterMember;
  message?: string;
}

export type MembershipVerificationCode =
  | 'VALID'
  | 'NOT_ON_ROSTER'
  | 'EMAIL_NOT_IN_TEAM'
  | 'TEAM_NOT_FOUND'
  | 'AMBIGUOUS_ROSTER_MATCH';

export interface MembershipVerificationResult {
  valid: boolean;
  code: MembershipVerificationCode;
  team?: ApprovedTeam;
  member?: ApprovedRosterMember;
  message: string;
}

// Internal override hooks for unit testing
let customTeams: ApprovedTeam[] | null = null;
let customRoster: ApprovedRosterMember[] | null = null;

function getActiveTeams(): readonly ApprovedTeam[] {
  return customTeams || APPROVED_TEAMS;
}

function getActiveRoster(): readonly ApprovedRosterMember[] {
  return customRoster || APPROVED_ROSTER;
}

export const rosterService = {
  /**
   * Returns matching team names for autocomplete suggestions.
   * Strips all PII and returns strictly an array of team names preserving original casing.
   */
  searchApprovedTeamNames(query?: string, limit: number = 10): string[] {
    const teams = getActiveTeams();
    const cleanQuery = (query || '').trim().toLowerCase();

    if (!cleanQuery) {
      return teams.slice(0, Math.min(limit, 28)).map((t) => t.teamName);
    }

    // Prioritize prefix matches, then substring matches
    const prefixMatches: string[] = [];
    const substringMatches: string[] = [];

    for (const t of teams) {
      const lower = t.teamName.toLowerCase();
      if (lower.startsWith(cleanQuery)) {
        prefixMatches.push(t.teamName);
      } else if (lower.includes(cleanQuery)) {
        substringMatches.push(t.teamName);
      }
    }

    const combined = [...prefixMatches, ...substringMatches];
    return combined.slice(0, limit);
  },

  /**
   * Resolves an approved team by exact or case-insensitive name match.
   */
  getApprovedTeamByName(name: string): ApprovedTeam | null {
    if (!name || typeof name !== 'string') return null;
    const clean = name.trim().toLowerCase();
    const teams = getActiveTeams();
    return teams.find((t) => t.teamName.trim().toLowerCase() === clean) || null;
  },

  /**
   * Resolves an approved team by its stable external Regn ID.
   */
  getApprovedTeamByRegnId(regnId: string): ApprovedTeam | null {
    if (!regnId || typeof regnId !== 'string') return null;
    const clean = regnId.trim();
    const teams = getActiveTeams();
    return teams.find((t) => t.regnId.trim() === clean) || null;
  },

  /**
   * Finds the roster entry for a given participant email address.
   * Checks custom test roster first, then database (ApprovedRosterMember table),
   * and falls back to fixture if in offline/memory mode.
   */
  async findRosterEntryByEmail(email: string): Promise<ApprovedRosterMember | null> {
    if (!email || typeof email !== 'string') return null;
    const cleanEmail = email.trim().toLowerCase();

    if (customRoster) {
      const matches = customRoster.filter((r) => r.email.trim().toLowerCase() === cleanEmail);
      return matches.length === 1 ? matches[0] : null;
    }

    try {
      const dbMembers = await prisma.approvedRosterMember.findMany({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      });
      if (dbMembers.length === 1) {
        return {
          regnId: dbMembers[0].regnId,
          teamName: dbMembers[0].teamName,
          email: dbMembers[0].email,
          isLeader: dbMembers[0].isLeader,
        };
      }
      if (dbMembers.length > 1) {
        return null;
      }
    } catch {
      // Prisma not available or offline, fall back to fixture
    }

    const roster = getActiveRoster();
    const matches = roster.filter((r) => r.email.trim().toLowerCase() === cleanEmail);
    return matches.length === 1 ? matches[0] : null;
  },

  /**
   * Checks whether the given email maps to a single approved team on the roster.
   * Primary source: PostgreSQL ApprovedRosterMember table.
   * Fails closed if multiple or ambiguous associations are found.
   */
  async findTeamForEmail(email: string): Promise<TeamMatchResult> {
    if (!email || typeof email !== 'string') {
      return { status: 'NOT_FOUND', message: 'Email is required' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check unit test override hook
    if (customRoster) {
      const matches = customRoster.filter((r) => r.email.trim().toLowerCase() === cleanEmail);
      if (matches.length === 0) {
        return { status: 'NOT_FOUND', message: 'Email address not found in event roster' };
      }
      if (matches.length > 1) {
        return {
          status: 'AMBIGUOUS',
          message: 'Multiple roster entries found for email address. Administrative resolution is required.',
        };
      }
      const matchedEntry = matches[0];
      const team = this.getApprovedTeamByName(matchedEntry.teamName);
      if (!team) {
        return {
          status: 'NOT_FOUND',
          message: `Roster references team "${matchedEntry.teamName}", but team is not in approved registry.`,
        };
      }
      return { status: 'MATCH', team, member: matchedEntry };
    }

    // 2. Query Database (Supabase PostgreSQL ApprovedRosterMember)
    try {
      const dbMembers = await prisma.approvedRosterMember.findMany({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      });

      if (dbMembers.length > 1) {
        return {
          status: 'AMBIGUOUS',
          message: 'Multiple roster entries found for email address. Administrative resolution is required.',
        };
      }

      if (dbMembers.length === 1) {
        const matchedEntry: ApprovedRosterMember = {
          regnId: dbMembers[0].regnId,
          teamName: dbMembers[0].teamName,
          email: dbMembers[0].email,
          isLeader: dbMembers[0].isLeader,
        };
        const team = this.getApprovedTeamByName(matchedEntry.teamName);
        if (!team) {
          return {
            status: 'NOT_FOUND',
            message: `Roster references team "${matchedEntry.teamName}", but team is not in approved registry.`,
          };
        }
        return { status: 'MATCH', team, member: matchedEntry };
      }
    } catch {
      // Database unavailable or running offline unit tests, fall through to fixture
    }

    // 3. Fallback to fixture data (for offline tests/dev)
    const roster = getActiveRoster();
    const matches = roster.filter((r) => r.email.trim().toLowerCase() === cleanEmail);

    if (matches.length === 0) {
      return { status: 'NOT_FOUND', message: 'Email address not found in event roster' };
    }

    if (matches.length > 1) {
      return {
        status: 'AMBIGUOUS',
        message: 'Multiple roster entries found for email address. Administrative resolution is required.',
      };
    }

    const matchedEntry = matches[0];
    const team = this.getApprovedTeamByName(matchedEntry.teamName);

    if (!team) {
      return {
        status: 'NOT_FOUND',
        message: `Roster references team "${matchedEntry.teamName}", but team is not in approved registry.`,
      };
    }

    return {
      status: 'MATCH',
      team,
      member: matchedEntry,
    };
  },

  /**
   * Verifies that a specific email and team name match the approved roster.
   */
  async verifyTeamMembership(params: { email: string; teamName: string }): Promise<MembershipVerificationResult> {
    const { email, teamName } = params;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return {
        valid: false,
        code: 'NOT_ON_ROSTER',
        message: 'A valid email address is required.',
      };
    }

    if (!teamName || typeof teamName !== 'string' || !teamName.trim()) {
      return {
        valid: false,
        code: 'TEAM_NOT_FOUND',
        message: 'A squad name is required.',
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanTeamName = teamName.trim().toLowerCase();

    const team = this.getApprovedTeamByName(teamName);
    if (!team) {
      return {
        valid: false,
        code: 'TEAM_NOT_FOUND',
        message: `Squad "${teamName}" is not an approved event team.`,
      };
    }

    // 1. Check unit test override hook
    if (customRoster) {
      const emailMatches = customRoster.filter((r) => r.email.trim().toLowerCase() === cleanEmail);
      if (emailMatches.length === 0) {
        return {
          valid: false,
          code: 'NOT_ON_ROSTER',
          message: 'Your email address was not found on the event participant roster.',
        };
      }
      if (emailMatches.length > 1) {
        return {
          valid: false,
          code: 'AMBIGUOUS_ROSTER_MATCH',
          message: 'Multiple roster entries found for your email address. Administrative resolution is required.',
        };
      }
      const memberEntry = emailMatches[0];
      if (memberEntry.teamName.trim().toLowerCase() !== cleanTeamName) {
        return {
          valid: false,
          code: 'EMAIL_NOT_IN_TEAM',
          message: `Your email address is registered under squad "${memberEntry.teamName}", not "${team.teamName}".`,
        };
      }
      return {
        valid: true,
        code: 'VALID',
        team,
        member: memberEntry,
        message: 'Verified member of squad.',
      };
    }

    // 2. Check Database (Supabase PostgreSQL ApprovedRosterMember)
    try {
      const dbMembers = await prisma.approvedRosterMember.findMany({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      });

      if (dbMembers.length > 1) {
        return {
          valid: false,
          code: 'AMBIGUOUS_ROSTER_MATCH',
          message: 'Multiple roster entries found for your email address. Administrative resolution is required.',
        };
      }

      if (dbMembers.length === 1) {
        const memberEntry: ApprovedRosterMember = {
          regnId: dbMembers[0].regnId,
          teamName: dbMembers[0].teamName,
          email: dbMembers[0].email,
          isLeader: dbMembers[0].isLeader,
        };

        if (memberEntry.teamName.trim().toLowerCase() !== cleanTeamName) {
          return {
            valid: false,
            code: 'EMAIL_NOT_IN_TEAM',
            message: `Your email address is registered under squad "${memberEntry.teamName}", not "${team.teamName}".`,
          };
        }

        return {
          valid: true,
          code: 'VALID',
          team,
          member: memberEntry,
          message: 'Verified member of squad.',
        };
      }
    } catch {
      // Database unavailable or offline, fall through to fixture
    }

    // 3. Fallback to fixture data (for offline tests/dev)
    const roster = getActiveRoster();
    const emailMatches = roster.filter((r) => r.email.trim().toLowerCase() === cleanEmail);

    if (emailMatches.length === 0) {
      return {
        valid: false,
        code: 'NOT_ON_ROSTER',
        message: 'Your email address was not found on the event participant roster.',
      };
    }

    // Check for ambiguous or duplicate roster records
    if (emailMatches.length > 1) {
      return {
        valid: false,
        code: 'AMBIGUOUS_ROSTER_MATCH',
        message: 'Multiple roster entries found for your email address. Administrative resolution is required.',
      };
    }

    const memberEntry = emailMatches[0];
    if (memberEntry.teamName.trim().toLowerCase() !== cleanTeamName) {
      return {
        valid: false,
        code: 'EMAIL_NOT_IN_TEAM',
        message: `Your email address is registered under squad "${memberEntry.teamName}", not "${team.teamName}".`,
      };
    }

    return {
      valid: true,
      code: 'VALID',
      team,
      member: memberEntry,
      message: 'Verified member of squad.',
    };
  },

  getAllApprovedTeams(): readonly ApprovedTeam[] {
    return getActiveTeams();
  },

  getAllApprovedRoster(): readonly ApprovedRosterMember[] {
    return getActiveRoster();
  },

  /**
   * Testing hook to inject custom test rosters.
   */
  setCustomRoster(teams?: ApprovedTeam[] | null, roster?: ApprovedRosterMember[] | null): void {
    customTeams = teams || null;
    customRoster = roster || null;
  },

  resetRoster(): void {
    customTeams = null;
    customRoster = null;
  },
};
