// save as changes.js
import { execSync } from "child_process";
import { writeFileSync } from "fs";

try {
    // Get current changes (unstaged + staged)
    const diff = execSync("git diff HEAD", { encoding: "utf-8" });

    // Or to include staged changes as well:
    // const diff = execSync("git diff HEAD && git diff --cached", { encoding: "utf-8" });

    // Write to file
    const outputFile = "scripts/changes.txt";
    writeFileSync(outputFile, diff);

    console.log(`✅ Git changes written to ${outputFile}`);
} catch (err) {
    console.error("❌ Error capturing git diff:", err.message);
}
