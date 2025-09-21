const fs = require("fs-extra");
const path = require("path");
const AdmZip = require("adm-zip");
const { execSync } = require("child_process");

// Config
const extName = "playnite-viewer-bridge";
const version = "1.0.0";
const dllName = "PlayniteViewerBridge.dll";
const root = "playnite/PlayniteViewerBridge";
const dist = "extension";
const projectPath = `${root}/PlayniteViewerBridge.csproj`;
const buildOutput = `${root}/bin/Release/net462`;
const yamlPath = `${root}/extension.yaml`;

const zipName = `${extName}-${version}.pext`;
const tempDir = path.join(`${root}/.temp`, extName);
const readmePath = `${root}/README.md`;
// const changelogPath = `${root}/CHANGELOG.md`;

async function run() {
  try {
    console.log("📦 Restoring NuGet packages...");
    execSync(`dotnet restore ${projectPath}`, { stdio: "inherit" });

    // 1. Build the .NET DLL
    console.log("🛠️  Building Playnite extension...");
    execSync(`dotnet build ${projectPath} -c Release`, { stdio: "inherit" });

    // 2. Prepare temp output folder
    await fs.remove(tempDir);
    await fs.ensureDir(tempDir);

    // 3. Copy DLL and YAML
    const dllSrc = path.join(buildOutput, dllName);
    const dllDst = path.join(tempDir, dllName);
    const yamlDst = path.join(tempDir, "extension.yaml");

    await fs.copyFile(dllSrc, dllDst);
    await fs.copyFile(yamlPath, yamlDst);

    // 4. Zip to .pext
    const zip = new AdmZip();
    zip.addLocalFile(dllDst);
    zip.addLocalFile(yamlDst);

    await fs.ensureDir(dist);
    const zipPath = path.join(dist, zipName);
    zip.writeZip(zipPath);
    const latestZipPath = path.join(dist, "latest.pext");
    zip.writeZip(latestZipPath);

    if (await fs.pathExists(readmePath)) {
      zip.addLocalFile(readmePath);
    }
    
    // if (await fs.pathExists(changelogPath)) {
    //   zip.addLocalFile(changelogPath);
    // }

    console.log(`✅ Extension packed: ${zipPath}`);
  } catch (err) {
    console.error("❌ Failed to pack extension", err);
    process.exit(1);
  }
}

run();
