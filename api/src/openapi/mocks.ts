import express from "express";
import type { Request, Response } from "express";
import { OpenAPIBackend, Context } from "openapi-backend";

export async function createOpenApiMockRouter(swaggerSpec: any) {
    const api = new OpenAPIBackend({ definition: swaggerSpec });
    await api.init();

    const router = express.Router();

    // We’ll drive express responses via handlers below.
    api.register({
        // For any matched operation with no explicit handler, return a mock
        notImplemented: (c: Context, _req: Request, res: Response) => {
            const mocked = c.mockResponseForOperation(c.operation.operationId as string);
            const status = Number(mocked.status) || 200;
            res.status(status).json(mocked.mock);
        },
        validationFail: (c: Context, _req: Request, res: Response) => {
            res.status(400).json({ ok: false, error: "validation_failed", details: c.validation.errors });
        },
        notFound: (_c: Context, _req: Request, res: Response) => {
            res.status(404).json({ ok: false, error: "not_found" });
        },
    });

    // Glue: translate Express request to OpenAPIBackend
    router.use((req, res) => api.handleRequest(
        {
            method: req.method,
            path: req.path,        // spec uses servers: [/api], so paths like /zips match /api/zips
            body: req.body,
            query: req.query as any,
            headers: req.headers as any,
        },
        req,
        res,
    ));

    return router;
}
