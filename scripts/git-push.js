#!/usr/bin/env node
import { execSync } from 'child_process';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const out = (cmd) => execSync(cmd).toString().trim();

try {
  run('git fetch origin main');

  const ahead = parseInt(out('git rev-list --count origin/main..HEAD'), 10);
  if (ahead === 0) {
    console.log('No new commits to push');
    // Keep dev in sync anyway (idempotent)
    run('node scripts/set-version.js');
    run('npm run up');
    process.exit(0);
  }

  // Bump & create release commit+tag; postbump hook generates files,
  // --commit-all makes standard-version include them in the release commit.
  run('npx standard-version --commit-all');

  // Push commit and tag
  run('git push --follow-tags origin main');

  // Refresh local dev
  run('npm run up');
} catch (e) {
  console.error(e?.message || e);
  process.exit(1);
}
