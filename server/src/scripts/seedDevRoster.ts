import { dbService } from '../services/db.service';
import { DEV_TEAMS, DEV_PARTICIPANTS } from '../fixtures/devRoster';

async function run() {
  console.log('🚀 Initializing storage driver for development fixtures seeding...');
  const driver = await dbService.initStorage();
  console.log(`📡 Storage Driver selected: ${driver.toUpperCase()}`);

  const result = await dbService.seedDevFixtures();
  console.log(`✅ Success: Seeded ${result.teamsCount} teams and ${result.participantsCount} participants into ${result.driver.toUpperCase()}`);

  // Verification step: Ensure the records actually exist in the active storage
  for (const t of DEV_TEAMS) {
    const found = await dbService.getTeam(t.id);
    if (!found) {
      throw new Error(`Verification failure: Team ${t.id} was not found in storage after seeding.`);
    }
  }

  for (const p of DEV_PARTICIPANTS) {
    const found = await dbService.getUser(p.id);
    if (!found) {
      throw new Error(`Verification failure: Participant ${p.id} was not found in storage after seeding.`);
    }
    if (found.teamId !== p.teamId) {
      throw new Error(`Verification failure: Participant ${p.id} has incorrect teamId ${found.teamId}; expected ${p.teamId}.`);
    }
  }

  console.log('🎉 Verification passed! All 4 dev teams and 16 participants verified in storage.');
}

run().catch((err) => {
  console.error('❌ Failed to seed development fixtures:', err);
  process.exit(1);
});
