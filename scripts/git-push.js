#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const out = (cmd) => execSync(cmd).toString().trim();

try {
  // Always check push necessity first — if nothing to push, exit immediately.
  run('git fetch origin main');

  const ahead = parseInt(out('git rev-list --count origin/main..HEAD'), 10);
  if (ahead === 0) {
    console.log('No new commits to push. Exiting without doing anything.');
    process.exit(0);
  }

  // From here on, we know there are commits to push.

  // 1) block pushes unless E2E passes
  run('node scripts/e2e-gate.js');

  // 2) bump version & create the release commit (but no tag yet)
  //    --commit-all ensures staged/unstaged changes get included in the release commit
  run('npx standard-version --commit-all --skip.tag');

  // 3) build artefacts (reads bumped package.json.version)
  //    - runs build:version (regenerate extension.yaml + Version.g.cs)
  //    - runs workspace builds
  //    - builds .pext
  //    - updates codebase.txt
  run('npm run build');

  // 4) include newly generated files in the SAME release commit (amend without changing the message)
  run('git add -A');
  run('git commit --amend --no-edit');

  // 5) read the *updated* version from disk (avoid stale ESM import cache)
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
  const version = pkg.version;
  const tag = `v${version}`;

  // 6) create/move the tag to this amended commit
  run(`git tag -f ${tag}`);

  // 7) push branch + updated tag
  run('git push origin main');
  run(`git push -f origin ${tag}`);

  // 8) refresh local dev stack
  run('npm run up');
} catch (e) {
  console.error(e?.message || e);
  process.exit(1);
}
