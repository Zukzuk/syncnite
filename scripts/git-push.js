#!/usr/bin/env node
import { execSync } from 'child_process';

function run(cmd) { execSync(cmd, { stdio: 'inherit' }); }
function out(cmd) { return execSync(cmd).toString().trim(); }

try {
  run('git fetch origin main');

  const ahead = parseInt(out('git rev-list --count origin/main..HEAD'), 10);
  if (ahead === 0) {
    console.log('No new commits to push');
    // still sync & refresh dev so everything matches package.json version
    run('npm run version:set');
    run('npm run up');
    process.exit(0);
  }

  // 1) bump+tag from conventional commits (updates package.json.version)
  run('npx standard-version');

  // 2) push commits + tags
  run('git push --follow-tags origin main');

  // 3) regenerate extension manifest + C# version from bumped package.json
  run('npm run version:set');

  // 4) refresh local dev (up.js injects VERSION from package.json → build args + env)
  run('npm run up');
} catch (e) {
  console.error(e?.message || e);
  process.exit(1);
}
