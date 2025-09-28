#!/usr/bin/env node
import { execSync } from 'child_process';
import pkg from '../package.json' with { type: 'json' };

function run(cmd) { console.log('→', cmd); execSync(cmd, { stdio: 'inherit' }); }
function ensureBuilder(name = 'multi-builder') {
  try { execSync(`docker buildx inspect ${name}`, { stdio: 'ignore' }); }
  catch { run(`docker buildx create --name ${name} --use`); }
  run(`docker buildx inspect --bootstrap`);
}

(function main() {
  const version = pkg.version;
  if (!version) { console.error('No "version" in package.json'); process.exit(1); }

  const HUB = 'zukzuk';
  const API_REPO = `${HUB}/syncnite-api`;
  const WEB_REPO = `${HUB}/syncnite-web`;

  ensureBuilder();

  // API
  run([
    'docker buildx build',
    '--platform linux/amd64,linux/arm64',
    '-f api/Dockerfile',
    `--build-arg APP_VERSION=${version}`,
    `-t ${API_REPO}:${version}`,
    `-t ${API_REPO}:latest`,
    '--push',
    '.'
  ].join(' '));

  // WEB
  run([
    'docker buildx build',
    '--platform linux/amd64,linux/arm64',
    '-f web/Dockerfile',
    `--build-arg APP_VERSION=${version}`,
    `-t ${WEB_REPO}:${version}`,
    `-t ${WEB_REPO}:latest`,
    '--push',
    '.'
  ].join(' '));

  console.log('🎉 Release done.');
})();
