import { test, expect } from "@playwright/test";

test("SPA boots and API responds on /ping", async ({ page }) => {
    // 1) SPA loads
    await page.goto("/");
    const html = await page.content();
    expect(html).toContain("<!DOCTYPE html>");

    // 2) API ping through the web's Nginx proxy
    //    We send auth headers if configured, but only assert "no 5xx".
    const headers = {
        Accept: "application/json",
        ...(process.env.E2E_AUTH_EMAIL
            ? { "x-auth-email": process.env.E2E_AUTH_EMAIL }
            : {}),
        ...(process.env.E2E_AUTH_PASSWORD
            ? { "x-auth-password": process.env.E2E_AUTH_PASSWORD }
            : {}),
        ...(process.env.E2E_CLIENT_ID
            ? { "x-client-id": process.env.E2E_CLIENT_ID }
            : {}),
    };

    const pingStatus = await page.evaluate(async (headersObj) => {
        try {
            const res = await fetch("/api/v1/ping", { headers: headersObj });
            return res.status;
        } catch {
            // Network / proxy failure
            return 0;
        }
    }, headers);

    // "Init + running" semantics:
    // - status 0: cannot reach API at all → fail (stack is broken)
    // - 5xx: API crashed / unhealthy → fail
    // - 2xx/3xx/4xx: API is up and handling requests → OK for smoke
    expect(pingStatus).toBeGreaterThan(0);
    expect(pingStatus).toBeLessThan(500);
});
