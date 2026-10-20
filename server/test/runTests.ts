import { spawnSync } from 'child_process';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('No test files specified.');
  process.exit(1);
}

let failed = false;

for (const file of files) {
  console.log(`\n========================================\n▶ Executing: ${file}\n========================================`);
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(cmd, ['tsx', file], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  if (result.status !== 0) {
    console.error(`\n❌ Test file failed: ${file} (exit code ${result.status})`);
    failed = true;
    break;
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('\n✅ All test suites passed successfully!');
}
