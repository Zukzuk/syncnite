#!/usr/bin/env node
import { execSync } from 'child_process';
import pkg from '../package.json' with { type: 'json' };

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const out = (cmd) => execSync(cmd).toString().trim();

try {
  run('git fetch origin main');

  const ahead = parseInt(out('git rev-list --count origin/main..HEAD'), 10);
  if (ahead === 0) {
    console.log('No new commits to push');
    // keep dev up-to-date anyway
    run('npm run build');
    run('npm run up');
    process.exit(0);
  }

  // 1) bump version & create the release commit (but no tag yet)
  //    --commit-all ensures staged/unstaged changes get included in the release commit
  run('npx standard-version --commit-all --skip.tag');

  // 2) build artefacts (reads bumped package.json.version)
  //    - runs build:version (regenerate extension.yaml + Version.g.cs)
  //    - runs workspace builds
  //    - builds .pext
  //    - updates codebase.txt
  run('npm run build');

  // 3) include newly generated files in the SAME release commit
  //    (amend without changing the message)
  run('git add -A');
  run('git commit --amend --no-edit');

  // 4) create/move the tag to this amended commit
  const version = pkg.version;                 // bumped value
  const tag = `v${version}`;
  run(`git tag -f ${tag}`);

  // 5) push branch + updated tag
  run('git push origin main');
  run(`git push -f origin ${tag}`);

  // 6) refresh local dev stack
  run('npm run up');
} catch (e) {
  console.error(e?.message || e);
  process.exit(1);
}
