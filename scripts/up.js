#!/usr/bin/env node
import { spawnSync } from 'child_process';
import pkg from '../package.json' with { type: 'json' };
const VERSION = pkg.version;
console.log(`→ dev up with VERSION=${VERSION}`);
const res = spawnSync('docker', ['compose', '-f', 'docker-compose.yml', 'up', '--build', '-d'], {
    stdio: 'inherit',
    env: { ...process.env, VERSION }
});
process.exit(res.status ?? 0);
