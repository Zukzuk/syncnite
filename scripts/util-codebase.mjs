import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * npm run codebase                # scans entire repo (default)
 * npm run codebase -- web         # scans repoRoot/web
 * npm run codebase -- /web        # also scans repoRoot/web (repo-relative)
 * npm run codebase -- ./services/api
 */

// ---------- repo root ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// ---------- argument parsing ----------
const rawArg = process.argv[2] ?? "";

// Turn user input into a start directory inside the repo (or absolute path)
function resolveStartDir(input) {
  if (!input) return repoRoot;

  if (path.isAbsolute(input) && fs.existsSync(input)) return input;

  // strip leading slashes/backslashes to treat "/web" or "\web" as repo-relative
  const cleaned = input.replace(/^[/\\]+/, "");
  return path.resolve(repoRoot, cleaned);
}

const rootDir = resolveStartDir(rawArg);

function makeTimestamp() {
  return Date.now(); // e.g. 1731674385123
}

/**
 * Returns:
 *  - outputFile: full path to the new file (with timestamp)
 *  - familyPrefix: filename prefix used to identify older versions for the same target
 */
function makeOutputFile(arg) {
  // take the last path segment as folder name
  const lastSeg = arg
    ? path.basename(arg.replace(/[/\\]+$/, "")) // remove trailing slash/backslash first
    : "";
  const safeSeg = lastSeg || "root";

  const baseName = `codebase_${safeSeg}`; // logical “target”
  const timestamp = makeTimestamp();
  const fileName = `${baseName}_${timestamp}.txt`;
  const familyPrefix = `${baseName}_`; // used to find old versions

  return {
    outputFile: path.join(repoRoot, "scripts", fileName),
    familyPrefix,
  };
}

const { outputFile, familyPrefix } = makeOutputFile(rawArg);

// ---------- filters ----------
const ignoreDirs = new Set([
  "node_modules",
  "dist",
  ".git",
  "scripts",
  "data",
  "uploads",
  ".temp",
  "bin",
  "obj",
]);
const ignoreFiles = new Set([
  "package-lock.json",
  "workspace.json",
  "tsconfig.json",
]);
const includeExts = new Set([
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".sh",
  ".yml",
  ".yaml",
  ".json",
  ".dsl",
  ".html",
  ".conf",
  ".mts",
  ".csproj",
  ".cs",
]);

let result = "";

/** check if we should include a file */
function shouldIncludeFile(entryName) {
  if (ignoreFiles.has(entryName)) return false;
  if (entryName === "Dockerfile" || entryName.startsWith("Dockerfile.")) return true;
  if (entryName === ".env" || entryName.startsWith(".env.")) return true;
  return includeExts.has(path.extname(entryName).toLowerCase());
}

/** recursively collect */
function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) collectFiles(fullPath);
    } else if (entry.isFile() && shouldIncludeFile(entry.name)) {
      const rel = path.relative(rootDir, fullPath) || entry.name;
      const relativePath = rel.split(path.sep).join("/"); // normalise for headers
      const content = fs.readFileSync(fullPath, "utf-8");
      result += `\n\n===== ${relativePath} =====\n\n`;
      result += content.endsWith("\n") ? content : content + "\n";
    }
  }
}

/** delete older versions of the same target in the output folder */
function cleanupOldOutputs(dir, familyPrefix, keepFileName) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;

    // only touch files of the same "family"
    if (!name.startsWith(familyPrefix) || !name.endsWith(".txt")) continue;
    if (name === keepFileName) continue; // don't delete the current one

    const fullPath = path.join(dir, name);
    fs.unlinkSync(fullPath);
  }
}

// ---------- run ----------
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
collectFiles(rootDir);
fs.writeFileSync(outputFile, result, "utf-8");

// delete old versions for the same target *after* writing the new one
cleanupOldOutputs(path.dirname(outputFile), familyPrefix, path.basename(outputFile));

console.log(`✅ Samengevoegd naar ${outputFile}`);
console.log(`🧹 Oude versies voor doel '${familyPrefix}' opgeschoond in ${path.dirname(outputFile)}`);
console.log(`🔎 Bronstart: ${rootDir}`);
