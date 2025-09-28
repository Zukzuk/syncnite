#!/usr/bin/env node
import { execSync } from 'child_process';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const out = (cmd) => execSync(cmd).toString().trim();

try {
  run('git fetch origin main');

  const ahead = parseInt(out('git rev-list --count origin/main..HEAD'), 10);

  if (ahead === 0) {
    console.log('No new commits to push');
    // still regenerate and (re)build the extension so dev matches package.json
    run('node scripts/set-version.js');
    run('node scripts/build-ext.js');   // ← build .pext from current version
    run('npm run up');                  // ← bring dev up with fresh latest.pext
    process.exit(0);
  }

  // Bump + tag (postbump runs set-version.js)
  run('npx standard-version --commit-all');

  // Push commit + tag
  run('git push --follow-tags origin main');

  // Build the Playnite extension (.pext -> extension/latest.pext)
  run('node scripts/build-ext.js');     // ← always build a fresh package

  // Refresh local dev stack (bind-mount serves new latest.pext)
  run('npm run up');
} catch (e) {
  console.error(e?.message || e);
  process.exit(1);
}
