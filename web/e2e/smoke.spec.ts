import { test, expect } from "@playwright/test";

test("SPA loads and API mocks are reachable", async ({ page }) => {
    // 1) SPA loads
    await page.goto("/");
    // we don't assume specific UI text; just ensure HTML loaded
    const html = await page.content();
    expect(html).toContain("<!DOCTYPE html>");

    // 2) Call the mocked producer endpoint through the web's Nginx proxy
    // This ensures web -> api works inside the compose network.
    const zips = await page.evaluate(async () => {
        const res = await fetch("/api/zips", { headers: { "Accept": "application/json" } });
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
    });

    // In MOCKS=spec, /api/zips returns the example array defined in your OpenAPI spec.
    // We don't assert exact names to keep this test stable—just structure.
    expect(Array.isArray(zips)).toBeTruthy();
    if (zips.length > 0) {
        expect(zips[0]).toHaveProperty("name");
    }

    // (Optional) very lightweight SSE check: connect and wait for the first event.
    // This validates the dedicated /api/sse location and streaming behavior.
    const gotFirstEvent = await page.evaluate(async () => {
        return await new Promise<boolean>((resolve) => {
            const es = new EventSource("/api/sse");
            const done = () => { try { es.close(); } catch { } };
            const timeout = setTimeout(() => { done(); resolve(false); }, 3000);
            es.addEventListener("log", () => { clearTimeout(timeout); done(); resolve(true); });
        });
    });
    expect(gotFirstEvent).toBeTruthy();
});
