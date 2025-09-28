#!/usr/bin/env node
import { execSync } from 'child_process';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const out = (cmd) => execSync(cmd).toString().trim();

try {
  run('git fetch origin main');
  const ahead = parseInt(out('git rev-list --count origin/main..HEAD'), 10);

  if (ahead === 0) {
    console.log('No new commits to push');
    run('npm run build');
    run('npm run up');
    process.exit(0);
  }

  // Bump + tag (postbump runs build)
  run('npx standard-version --commit-all');
  // Push commit + tag
  run('git push --follow-tags origin main');
  run('npm run up');
} catch (e) {
  console.error(e?.message || e);
  process.exit(1);
}
