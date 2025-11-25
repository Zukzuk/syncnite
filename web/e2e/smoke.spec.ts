import { test, expect } from "@playwright/test";

test("SPA loads and API ping is reachable", async ({ page }) => {
    // 1) SPA loads
    await page.goto("/");
    const html = await page.content();
    expect(html).toContain("<!DOCTYPE html>");

    // 2) Call the ping endpoint through the web's Nginx proxy
    // This validates web -> api connectivity inside the compose network.
    const ping = await page.evaluate(async () => {
        const res = await fetch("/api/v1/ping", {
            headers: { "Accept": "application/json" },
        });

        const text = await res.text();
        return {
            ok: res.ok,
            status: res.status,
            body: text,
        };
    });

    expect(ping.ok).toBeTruthy();
    expect(ping.status).toBe(200);
    // We *don’t* assert on ping.body shape to keep this stable across versions.

    // 3) (Optional) keep the SSE smoke check if you still want to validate streaming
    const gotFirstEvent = await page.evaluate(async () => {
        return await new Promise<boolean>((resolve) => {
            const es = new EventSource("/api/v1/sse");
            const done = () => {
                try {
                    es.close();
                } catch {
                    // ignore
                }
            };
            const timeout = setTimeout(() => {
                done();
                resolve(false);
            }, 3000);

            es.addEventListener("log", () => {
                clearTimeout(timeout);
                done();
                resolve(true);
            });
        });
    });
    expect(gotFirstEvent).toBeTruthy();
});
