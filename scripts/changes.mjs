import { execSync } from "child_process";
import {
    writeFileSync,
    mkdirSync,
    existsSync,
    readdirSync,
    unlinkSync,
} from "fs";
import path from "path";

function makeTimestamp() {
    return Date.now().toString();
}

function makeOutputFile() {
    const outputDir = path.join("scripts");
    const baseName = "changes";          // logical target name
    const familyPrefix = `${baseName}_`; // used to find old versions
    const timestamp = makeTimestamp();
    const fileName = `${baseName}_${timestamp}.txt`;
    const outputFile = path.join(outputDir, fileName);

    return { outputDir, outputFile, familyPrefix, fileName };
}

function cleanupOldOutputs(dir, familyPrefix, keepFileName) {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const name = entry.name;

        // only touch files of the same "family"
        if (!name.startsWith(familyPrefix) || !name.endsWith(".txt")) continue;
        if (name === keepFileName) continue; // don't delete the current one

        const fullPath = path.join(dir, name);
        unlinkSync(fullPath);
    }
}

try {
    // Get current changes (unstaged + staged)
    const diff = execSync("git diff HEAD", { encoding: "utf-8" });

    const { outputDir, outputFile, familyPrefix, fileName } = makeOutputFile();

    // ensure scripts folder exists
    mkdirSync(outputDir, { recursive: true });

    // write new file
    writeFileSync(outputFile, diff);

    // cleanup older versions for this "changes" target
    cleanupOldOutputs(outputDir, familyPrefix, fileName);

    console.log(`✅ Git changes written to ${outputFile}`);
    console.log(
        `🧹 Oude versies voor doel '${familyPrefix}' opgeschoond in ${outputDir}`
    );
} catch (err) {
    console.error("❌ Error capturing git diff:", err.message);
}
