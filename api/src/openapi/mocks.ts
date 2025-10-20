import express, { Request, Response } from "express";
import { OpenAPIBackend, Context } from "openapi-backend";

export async function createOpenApiMockRouter(swaggerSpec: any) {
    const api = new OpenAPIBackend({ definition: swaggerSpec });
    await api.init();

    const router = express.Router();

    api.register({
        // send a mock for any matched operation that doesn't have a handler
        notImplemented: (c: Context, _req: Request, res: Response) => {
            const opId = c.operation?.operationId;
            if (opId) {
                const mocked = api.mockResponseForOperation(opId);
                const status = Number(mocked.status) || 200;
                return res.status(status).json(mocked.mock);
            }
            // no operation matched, fall back
            return res.status(404).json({ ok: false, error: "not_found" });
        },

        validationFail: (c: Context, _req: Request, res: Response) => {
            return res
                .status(400)
                .json({ ok: false, error: "validation_failed", details: c.validation?.errors });
        },

        notFound: (_c: Context, _req: Request, res: Response) => {
            return res.status(404).json({ ok: false, error: "not_found" });
        },
    });

    // express adapter
    router.use((req, res) =>
        api.handleRequest(
            {
                method: req.method,
                path: req.path, // spec uses servers: [/api], so /api/foo -> /foo
                body: req.body,
                query: req.query as any,
                headers: req.headers as any,
            },
            req,
            res
        )
    );

    return router;
}
