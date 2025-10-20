#!/usr/bin/env node
import { spawnSync } from "child_process";
import pkg from "../package.json" with { type: "json" };

const VERSION = pkg.version || "dev";
const COMPOSE = ["-f", "docker-compose.yml", "-f", "docker-compose.e2e.yml"];

function run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, {
        stdio: "inherit",
        env: { ...process.env, VERSION },
        ...opts,
    });
    return r.status ?? 0;
}

console.log(`🔒 E2E gate with VERSION=${VERSION}`);

// 1) Bring up mocked API+web (detached)
let code = run("docker", ["compose", ...COMPOSE, "up", "-d", "web", "api"]);
if (code !== 0) process.exit(code);

// 2) Run the playwright tests (containerized)
code = run("docker", ["compose", ...COMPOSE, "run", "--rm", "e2e"]);

// 3) Always clean up test-only services; keep web/api running for quick re-runs
// If you prefer to stop everything, use: ["down", "--remove-orphans"]
run("docker", ["compose", ...COMPOSE, "rm", "-sf", "e2e"]);

// 4) If tests failed, print a hint and exit non-zero
if (code !== 0) {
    console.error("\n❌ E2E failed. Open the HTML report:");
    console.error("   docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d e2e-report");
    console.error("   → http://localhost:9323\n");
    process.exit(code);
}

console.log("✅ E2E passed");
process.exit(0);
