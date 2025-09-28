#!/usr/bin/env node
const fs = require("fs-extra");
const path = require("path");
const AdmZip = require("adm-zip");
const { execSync } = require("child_process");

// === Config (version comes from root package.json) ===
const { version } = require("../package.json"); // <-- single source of truth
const extName = "syncnite-bridge";
const dllName = "SyncniteBridge.dll";

const root = "playnite/SyncniteBridge";
const dist = "extension";
const projectPath = `${root}/SyncniteBridge.csproj`;
const buildOutput = `${root}/bin/Release/net462`;
const yamlPath = `${root}/extension.yaml`;
const readmePath = `${root}/README.md`;
const changelogPath = `${root}/CHANGELOG.md`; // optional

const zipName = `${extName}-${version}.pext`;
const tempDir = path.join(`${root}/.temp`, extName);

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

(async function main() {
  try {
    // 0) Preconditions
    if (!(await fs.pathExists(yamlPath))) {
      throw new Error(
        `Missing ${yamlPath}. Did you run "npm run version:set" to render it from extension.yaml.tpl?`
      );
    }

    console.log("📦 Restoring NuGet packages...");
    run(`dotnet restore ${projectPath}`);

    // 1) Build the .NET DLL
    console.log("🛠️  Building Playnite extension...");
    run(`dotnet build ${projectPath} -c Release`);

    // 2) Prepare temp output folder
    await fs.remove(tempDir);
    await fs.ensureDir(tempDir);

    // 3) Copy DLL and YAML (required)
    const dllSrc = path.join(buildOutput, dllName);
    const dllDst = path.join(tempDir, dllName);
    const yamlDst = path.join(tempDir, "extension.yaml");

    await fs.copyFile(dllSrc, dllDst);
    await fs.copyFile(yamlPath, yamlDst);

    // 4) Prepare ZIP contents
    const zip = new AdmZip();
    zip.addLocalFile(dllDst);
    zip.addLocalFile(yamlDst);

    // Optional docs (must be added BEFORE writing the zip)
    if (await fs.pathExists(readmePath)) {
      zip.addLocalFile(readmePath);
    }
    if (await fs.pathExists(changelogPath)) {
      zip.addLocalFile(changelogPath);
    }

    // 5) Write zips
    await fs.ensureDir(dist);
    const versionedZipPath = path.join(dist, zipName);
    const latestZipPath = path.join(dist, "latest.pext");

    zip.writeZip(versionedZipPath);
    // For identical bytes, just copy the versioned file to "latest"
    await fs.copyFile(versionedZipPath, latestZipPath);

    console.log(`✅ Extension packed: ${versionedZipPath}`);
    console.log(`↪  Also wrote:      ${latestZipPath}`);
  } catch (err) {
    console.error("❌ Failed to pack extension", err);
    process.exit(1);
  }
})();
