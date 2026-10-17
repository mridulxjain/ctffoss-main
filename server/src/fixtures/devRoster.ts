import { Role } from '@fossctf/shared';

export interface DevTeamFixture {
  id: string;
  name: string;
  externalId: string;
  valenfindTeamId: string;
}

export interface DevParticipantFixture {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: Role;
  teamId: string;
}

export interface DevAdminFixture {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: Role;
  teamId: null;
}

/**
 * 4 Fake Development-only Teams with stable dev- fixtures
 */
export const DEV_TEAMS: DevTeamFixture[] = [
  {
    id: 'dev-team-byte-bandits',
    name: 'Byte Bandits',
    externalId: 'dev-team-byte-bandits',
    valenfindTeamId: 'valenfind-byte-bandits',
  },
  {
    id: 'dev-team-segfault-society',
    name: 'Segfault Society',
    externalId: 'dev-team-segfault-society',
    valenfindTeamId: 'valenfind-segfault-society',
  },
  {
    id: 'dev-team-kernel-panic',
    name: 'Kernel Panic',
    externalId: 'dev-team-kernel-panic',
    valenfindTeamId: 'valenfind-kernel-panic',
  },
  {
    id: 'dev-team-ctrl-alt-elite',
    name: 'Ctrl Alt Elite',
    externalId: 'dev-team-ctrl-alt-elite',
    valenfindTeamId: 'valenfind-ctrl-alt-elite',
  },
];

/**
 * 16 Fictional Participant Accounts (4 per team)
 * Uses reserved example.test emails and fictional usernames
 */
export const DEV_PARTICIPANTS: DevParticipantFixture[] = [
  // Byte Bandits (4)
  {
    id: 'usr-dev-byte-1',
    email: 'byte1@example.test',
    username: 'byte_bandit_1',
    displayName: 'Byte Bandit 1',
    role: 'USER',
    teamId: 'dev-team-byte-bandits',
  },
  {
    id: 'usr-dev-byte-2',
    email: 'byte2@example.test',
    username: 'byte_bandit_2',
    displayName: 'Byte Bandit 2',
    role: 'USER',
    teamId: 'dev-team-byte-bandits',
  },
  {
    id: 'usr-dev-byte-3',
    email: 'byte3@example.test',
    username: 'byte_bandit_3',
    displayName: 'Byte Bandit 3',
    role: 'USER',
    teamId: 'dev-team-byte-bandits',
  },
  {
    id: 'usr-dev-byte-4',
    email: 'byte4@example.test',
    username: 'byte_bandit_4',
    displayName: 'Byte Bandit 4',
    role: 'USER',
    teamId: 'dev-team-byte-bandits',
  },

  // Segfault Society (4)
  {
    id: 'usr-dev-segfault-1',
    email: 'segfault1@example.test',
    username: 'segfault_1',
    displayName: 'Segfault 1',
    role: 'USER',
    teamId: 'dev-team-segfault-society',
  },
  {
    id: 'usr-dev-segfault-2',
    email: 'segfault2@example.test',
    username: 'segfault_2',
    displayName: 'Segfault 2',
    role: 'USER',
    teamId: 'dev-team-segfault-society',
  },
  {
    id: 'usr-dev-segfault-3',
    email: 'segfault3@example.test',
    username: 'segfault_3',
    displayName: 'Segfault 3',
    role: 'USER',
    teamId: 'dev-team-segfault-society',
  },
  {
    id: 'usr-dev-segfault-4',
    email: 'segfault4@example.test',
    username: 'segfault_4',
    displayName: 'Segfault 4',
    role: 'USER',
    teamId: 'dev-team-segfault-society',
  },

  // Kernel Panic (4)
  {
    id: 'usr-dev-kernel-1',
    email: 'kernel1@example.test',
    username: 'kernel_panic_1',
    displayName: 'Kernel Panic 1',
    role: 'USER',
    teamId: 'dev-team-kernel-panic',
  },
  {
    id: 'usr-dev-kernel-2',
    email: 'kernel2@example.test',
    username: 'kernel_panic_2',
    displayName: 'Kernel Panic 2',
    role: 'USER',
    teamId: 'dev-team-kernel-panic',
  },
  {
    id: 'usr-dev-kernel-3',
    email: 'kernel3@example.test',
    username: 'kernel_panic_3',
    displayName: 'Kernel Panic 3',
    role: 'USER',
    teamId: 'dev-team-kernel-panic',
  },
  {
    id: 'usr-dev-kernel-4',
    email: 'kernel4@example.test',
    username: 'kernel_panic_4',
    displayName: 'Kernel Panic 4',
    role: 'USER',
    teamId: 'dev-team-kernel-panic',
  },

  // Ctrl Alt Elite (4)
  {
    id: 'usr-dev-ctrl-1',
    email: 'ctrl1@example.test',
    username: 'ctrl_alt_1',
    displayName: 'Ctrl Alt 1',
    role: 'USER',
    teamId: 'dev-team-ctrl-alt-elite',
  },
  {
    id: 'usr-dev-ctrl-2',
    email: 'ctrl2@example.test',
    username: 'ctrl_alt_2',
    displayName: 'Ctrl Alt 2',
    role: 'USER',
    teamId: 'dev-team-ctrl-alt-elite',
  },
  {
    id: 'usr-dev-ctrl-3',
    email: 'ctrl3@example.test',
    username: 'ctrl_alt_3',
    displayName: 'Ctrl Alt 3',
    role: 'USER',
    teamId: 'dev-team-ctrl-alt-elite',
  },
  {
    id: 'usr-dev-ctrl-4',
    email: 'ctrl4@example.test',
    username: 'ctrl_alt_4',
    displayName: 'Ctrl Alt 4',
    role: 'USER',
    teamId: 'dev-team-ctrl-alt-elite',
  },
];

/**
 * Dedicated development administrator fixture
 */
export const DEV_ADMIN: DevAdminFixture = {
  id: 'usr-admin-01',
  email: 'admin@fossclub.tech',
  username: 'foss_admin',
  displayName: 'Platform Admin',
  role: 'ADMIN',
  teamId: null,
};

/**
 * Legacy test accounts preserved for existing automated test suite compatibility
 */
export const LEGACY_TEST_ACCOUNTS = [
  { id: 'usr-alice-02', email: 'alice@university.edu', username: 'alice_sec', role: 'USER' as const, teamId: 'team-binary-beasts' },
  { id: 'usr-bob-03', email: 'bob@university.edu', username: 'bob_0x', role: 'USER' as const, teamId: 'team-binary-beasts' },
  { id: 'usr-charlie-04', email: 'charlie@university.edu', username: 'charlie_solo', role: 'USER' as const, teamId: null },
  { id: 'usr-dave-05', email: 'dave@university.edu', username: 'dave_bravo', role: 'USER' as const, teamId: 'team-null-pointers' },
];

/**
 * Set of all allowed development emails and usernames for fast lookup in devLogin
 */
export const ALLOWED_DEV_EMAILS = new Set([
  'krishnajain2604@gmail.com',
  DEV_ADMIN.email.toLowerCase(),
  ...DEV_PARTICIPANTS.map((p) => p.email.toLowerCase()),
  ...LEGACY_TEST_ACCOUNTS.map((a) => a.email.toLowerCase()),
]);

export const ALLOWED_DEV_USERNAMES = new Set([
  'mridulxjain',
  DEV_ADMIN.username.toLowerCase(),
  ...DEV_PARTICIPANTS.map((p) => p.username.toLowerCase()),
  ...LEGACY_TEST_ACCOUNTS.map((a) => a.username.toLowerCase()),
]);
