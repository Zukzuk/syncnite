// ESM script to:
// 1) Extract a Playnite backup ZIP with 7z
// 2) Normalize any extracted files that contain '\' in their names into proper subfolders
// 3) Optionally auto-read DatabasePassword from an extracted config.json
// 4) Auto-detect the dumper: either a self-contained native binary OR a DLL+runtimeconfig
// 5) Run the dumper to emit JSON for all LiteDB collections (recursively)

import { execFile } from "node:child_process";
import {
  statSync, mkdirSync, existsSync, readdirSync,
  renameSync, readFileSync, lstatSync, chmodSync
} from "node:fs";
import { join, dirname } from "node:path";
import { cpSync } from "node:fs"; // Node 20+ has cpSync

function findDirByName(root, wantedLower) {
  for (const { path: p, entry } of walk(root)) {
    if (entry.isDirectory() && entry.name.toLowerCase() === wantedLower) {
      return p;
    }
  }
  return null;
}

function copyDir(src, dst) {
  try {
    cpSync(src, dst, { recursive: true });
    console.log(`Copied ${src} -> ${dst}`);
  } catch (e) {
    console.error(`ERROR copying ${src} -> ${dst}: ${e.message}`);
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) {
        err.message += `\nSTDOUT:\n${stdout || ""}\nSTDERR:\n${stderr || ""}`;
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function assertFile(path) {
  try {
    const st = statSync(path);
    if (!st.isFile() || st.size === 0) throw new Error("not a regular file or empty");
  } catch (e) {
    throw new Error(`Backup zip not found/invalid: ${path} (${e.message})`);
  }
}

function* walk(dir, maxDepth = 12) {
  const stack = [{ d: dir, depth: 0 }];
  while (stack.length) {
    const { d, depth } = stack.pop();
    if (depth > maxDepth) continue;
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = join(d, e.name);
      yield { path: p, entry: e, depth };
      if (e.isDirectory()) stack.push({ d: p, depth: depth + 1 });
    }
  }
}

// Turn files like "/work/library\games.db" into "/work/library/games.db"
function normalizeBackslashPaths(root) {
  let moved = 0;
  for (const { path: p, entry } of walk(root)) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (name.includes("\\")) {
      const parts = name.split("\\");
      const target = join(dirname(p), ...parts);
      mkdirSync(dirname(target), { recursive: true });
      renameSync(p, target);
      moved++;
    }
  }
  if (moved) console.log(`Normalized ${moved} file path(s) with backslashes.`);
}

// Try to find DatabasePassword in any config.json under root
function findDatabasePassword(root) {
  for (const { path: p, entry } of walk(root)) {
    if (entry.isFile() && p.toLowerCase().endsWith("config.json")) {
      try {
        const raw = readFileSync(p, "utf8");
        const j = JSON.parse(raw);
        if (j && typeof j.DatabasePassword === "string" && j.DatabasePassword.length) {
          console.log(`Found DatabasePassword in: ${p}`);
          return j.DatabasePassword;
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}

// Detect dumper:
//  - Prefer DLL that has a matching .runtimeconfig.json and run with "dotnet"
//  - Otherwise look for a native executable (e.g., /app/dumper/PlayniteDump) and run it directly
function resolveDumper() {
  const override = process.env.DUMPER_BIN;
  if (override && existsSync(override)) {
    const isDll = override.toLowerCase().endsWith(".dll");
    return { cmd: isDll ? (process.env.DUMPER_CMD || "dotnet") : override, bin: override, viaDotnet: isDll };
  }

  const root = "/app/dumper";
  const dlls = [];
  const rcfg = new Map();

  try {
    for (const { path, entry } of walk(root, 3)) {
      if (!entry.isFile()) continue;
      const lower = entry.name.toLowerCase();
      if (lower.endsWith(".runtimeconfig.json")) {
        const base = entry.name.slice(0, -".runtimeconfig.json".length).toLowerCase();
        rcfg.set(base, path);
      } else if (lower.endsWith(".dll")) {
        dlls.push(path);
      }
    }
  } catch { /* ignore */ }

  for (const dll of dlls) {
    const base = dll.split("/").pop().slice(0, -".dll".length).toLowerCase();
    if (rcfg.has(base)) {
      return { cmd: (process.env.DUMPER_CMD || "dotnet"), bin: dll, viaDotnet: true };
    }
  }

  // Look for a native self-contained binary named like "PlayniteDump" (no extension)
  const candidates = [join(root, "PlayniteDump")];
  for (const c of candidates) {
    if (existsSync(c)) {
      try { chmodSync(c, 0o755); } catch { }
      return { cmd: c, bin: c, viaDotnet: false };
    }
  }

  // Last resort: show what's in /app/dumper
  try {
    console.error("Could not locate dumper DLL or native binary. Contents of /app/dumper:");
    for (const { path, entry } of walk(root, 2)) {
      console.error(` - ${entry.isDirectory() ? "[D]" : "[F]"} ${path}`);
    }
  } catch {
    console.error("Could not list /app/dumper (missing?)");
  }
  throw new Error("Could not locate dumper (DLL + runtimeconfig or native). Ensure Dockerfile copies build output to /app/dumper.");
}

async function main() {
  // Args: [node, script, backupZip?, outDir?]
  const backupZip = process.argv[2] || process.env.BACKUP_ZIP;
  let outDir = process.argv[3] || "/data";
  if (outDir && outDir.toLowerCase().endsWith(".dll")) {
    console.warn("NOTE: argv[3] looks like a DLL path; using /data as output dir instead.");
    outDir = "/data";
  }

  const { cmd, bin, viaDotnet } = resolveDumper();
  const workDir = "/work";
  mkdirSync(workDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  // Prepare env for dumper (maybe augmented with auto-detected password)
  const env = { ...process.env };

  const overrideLib = process.env.LIB_DIR_OVERRIDE;
  if (overrideLib) {
    try {
      const st = lstatSync(overrideLib);
      if (!st.isDirectory()) throw new Error("LIB_DIR_OVERRIDE is not a directory");
    } catch (e) {
      console.error(`ERROR: LIB_DIR_OVERRIDE invalid: ${overrideLib} (${e.message})`);
      process.exit(1);
    }
    console.log(`Using mounted library: ${overrideLib}`);
    console.log("Dumping LiteDB collections to JSON…");
    const args = viaDotnet ? [bin, overrideLib, outDir] : [overrideLib, outDir];
    await run(cmd, args, { env })
      .catch(e => { console.error("ERROR: Dump step failed."); console.error(String(e)); process.exit(1); });
    console.log("Done. JSON written to:", outDir);
    return;
  }

  if (!backupZip) {
    console.error("ERROR: Provide a backup zip via argv[2] or BACKUP_ZIP env, or set LIB_DIR_OVERRIDE.");
    process.exit(1);
  }

  assertFile(backupZip);

  console.log("Validating ZIP with 7z…");
  try {
    await run("7z", ["t", backupZip]);
  } catch (e) {
    console.error("ERROR: 7z test failed (corrupted/encrypted zip?).");
    console.error(String(e));
    process.exit(1);
  }

  console.log("Extracting backup with 7z…");
  try {
    await run("7z", ["x", "-y", `-o${workDir}`, backupZip]);
  } catch (e) {
    console.error("ERROR: 7z extraction failed.");
    console.error(String(e));
    process.exit(1);
  }

  normalizeBackslashPaths(workDir);

  // Copy the Playnite media folder into /data so the web can serve icons
  const libFilesDir = findDirByName(workDir, "libraryfiles");
  if (libFilesDir) {
    const dest = join(outDir, "libraryfiles");
    copyDir(libFilesDir, dest);
  } else {
    console.warn("No 'libraryfiles' directory found in backup (icons/covers may not render).");
  }

  // Auto-pick password from extracted config.json if present (unless already provided)
  if (!env.LITEDB_PASSWORD) {
    const autoPwd = findDatabasePassword(workDir);
    if (autoPwd) env.LITEDB_PASSWORD = autoPwd;
  }

  console.log("Dumping LiteDB collections to JSON…");
  const args = viaDotnet ? [bin, workDir, outDir] : [workDir, outDir];
  await run(cmd, args, { env })
    .catch(e => { console.error("ERROR: Dump step failed."); console.error(String(e)); process.exit(1); });

  console.log("Done. JSON written to:", outDir);
}

main().catch(e => { console.error(e); process.exit(1); });
