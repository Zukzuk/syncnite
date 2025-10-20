/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
    testDir: "./e2e",
    timeout: 30_000,
    use: {
        baseURL: process.env.WEB_BASE_URL || "http://localhost:3003",
        trace: "on-first-retry",
    },
    reporter: [["html", { outputFolder: "reports" }]], // <— write to ./reports
    projects: [{ name: "chromium" }],
};
module.exports = config;