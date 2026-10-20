import fs from 'fs';
import path from 'path';
import { dbService } from '../services/db.service';
import { rosterService } from '../services/roster.service';
import { prisma } from '../lib/prisma';
import { config } from '../config/index';

/**
 * Safe, idempotent, repeatable roster-import utility.
 *
 * Responsibilities:
 * 1. Synchronizes the 28 approved teams into active database storage (PostgreSQL).
 * 2. Uses the stable Unstop Regn ID as externalId.
 * 3. Preserves existing team primary keys (UUIDs), scores, solves, readiness, and Loventia voucher mappings.
 * 4. Strips all personal information (mobile numbers, demographic data, etc.).
 * 5. Can optionally import a private CSV or JSON file into the database `ApprovedRosterMember` table
 *    without checking personal details into git.
 *    Usage:
 *      npm run db:import-roster -- --dry-run
 *      npm run db:import-roster -- --roster-json=./private-roster.json
 *      npm run db:import-roster -- --roster-csv=./teams.csv
 */
async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  const rosterJsonArg = process.argv.find((a) => a.startsWith('--roster-json='));
  const rosterCsvArg = process.argv.find((a) => a.startsWith('--roster-csv='));

  console.log('🚀 [Roster Import] Initializing database storage...');
  const driver = await dbService.initStorage();
  console.log(`📡 Storage Driver: ${driver.toUpperCase()}`);
  console.log(`🔒 Mode: ${isDryRun ? 'DRY RUN (Preview Only)' : 'EXECUTE'}`);

  const approvedTeams = rosterService.getAllApprovedTeams();
  console.log(`📋 Approved Teams in Registry: ${approvedTeams.length}`);

  if (isDryRun) {
    console.log('\n[Dry Run Preview]:');
    for (const t of approvedTeams) {
      const existing = await dbService.getTeamByName(t.teamName);
      if (existing) {
        console.log(`  - Team "${t.teamName}" exists (ID: ${existing.id}, RegnID: ${existing.externalId || 'unset'} -> ${t.regnId})`);
      } else {
        console.log(`  - Team "${t.teamName}" will be CREATED (RegnID: ${t.regnId})`);
      }
    }
    console.log('\nDry run completed successfully. No database records were modified.');
    return;
  }

  // Execute idempotent team synchronization
  const result = await dbService.ensureApprovedTeams(approvedTeams);

  console.log('\n📊 [Teams Import Summary]:');
  console.log(`  - Total Approved Teams Processed: ${result.total}`);
  console.log(`  - Teams Created: ${result.created}`);
  console.log(`  - Teams Updated (ExternalId Synced): ${result.updated}`);
  console.log(`  - Teams Unchanged: ${result.total - result.created - result.updated}`);

  // Optional roster member import from file
  if (rosterJsonArg || rosterCsvArg) {
    console.log('\n👥 [Roster Members File Import]');
    let members: Array<{ regnId: string; teamName: string; email: string; isLeader: boolean }> = [];

    if (rosterJsonArg) {
      const filePath = path.resolve(rosterJsonArg.split('=')[1]);
      console.log(`   Reading JSON roster from: ${filePath}`);
      const raw = fs.readFileSync(filePath, 'utf8');
      members = JSON.parse(raw);
    } else if (rosterCsvArg) {
      const filePath = path.resolve(rosterCsvArg.split('=')[1]);
      console.log(`   Reading CSV roster from: ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const regnIdx = headers.findIndex((h) => h.toLowerCase().includes('regn') || h.toLowerCase().includes('id'));
      const teamIdx = headers.findIndex((h) => h.toLowerCase().includes('team') || h.toLowerCase().includes('squad'));
      const emailIdx = headers.findIndex((h) => h.toLowerCase().includes('email'));
      const roleIdx = headers.findIndex((h) => h.toLowerCase().includes('role') || h.toLowerCase().includes('leader'));

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols.length > Math.max(regnIdx, teamIdx, emailIdx)) {
          const email = cols[emailIdx]?.trim().toLowerCase();
          const teamName = cols[teamIdx]?.trim();
          const regnId = cols[regnIdx]?.trim();
          const isLeader = roleIdx >= 0 ? cols[roleIdx]?.toLowerCase().includes('leader') : false;
          if (email && teamName) {
            members.push({ regnId: regnId || '', teamName, email, isLeader });
          }
        }
      }
    }

    console.log(`   Importing ${members.length} member records into ApprovedRosterMember table...`);
    let memberCount = 0;
    for (const m of members) {
      const cleanEmail = m.email.trim().toLowerCase();
      await prisma.approvedRosterMember.upsert({
        where: { email: cleanEmail },
        create: {
          regnId: m.regnId,
          teamName: m.teamName,
          email: cleanEmail,
          isLeader: Boolean(m.isLeader),
        },
        update: {
          regnId: m.regnId,
          teamName: m.teamName,
          isLeader: Boolean(m.isLeader),
        },
      });
      memberCount++;
    }
    console.log(`   ✅ Synced ${memberCount} members into ApprovedRosterMember table.`);
  }

  // Report database roster status
  try {
    const dbCount = await prisma.approvedRosterMember.count();
    console.log(`\n🛡️  [Security Verification] Database ApprovedRosterMember records: ${dbCount}`);
  } catch {
    // Memory mode or offline
  }

  // Verification step: Ensure all 28 teams are resolvable by name and have valid IDs
  console.log('\n🔍 [Verification Step] Verifying team resolution in active storage...');
  let verifiedCount = 0;
  for (const t of approvedTeams) {
    const found = await dbService.getTeamByName(t.teamName);
    if (!found) {
      throw new Error(`Verification failed: Team "${t.teamName}" was not found in database after import.`);
    }
    if (found.externalId !== t.regnId) {
      throw new Error(`Verification failed: Team "${t.teamName}" has externalId "${found.externalId}", expected "${t.regnId}".`);
    }
    verifiedCount++;
  }

  console.log(`✅ Verification passed! All ${verifiedCount} approved teams confirmed in ${driver.toUpperCase()} storage.`);
  console.log('🎉 Roster import completed safely.');
}

if (require.main === module) {
  run().catch((err) => {
    console.error('❌ Roster import failed:', err);
    process.exit(1);
  });
}
