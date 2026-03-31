import { Router } from "express";
import { validateRequest } from "./core/validation/validator";
import { handleError } from "./core/errors/error.handler";
import { run } from "./core/run";
import { authMiddleware } from "./core/auth/auth.middleware";

const router = Router();

/**
 * Health check endpoint.
 */
router.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        engine: "hybrid-db-engine",
        timestamp: Date.now(),
    });
});

/**
 * Universal procedure executor endpoint.
 * Flow:
 * route → auth → validator → run() → guard → resolver → executor
 */
router.post("/run", authMiddleware, async (req, res) => {
    try {
        const body = validateRequest(req.body);

        /**
         * Pass auth data into engine
         */
        (body as any).__auth = (req as any).__auth;
        (body as any).__token = (req as any).__token;

        // IMPORTANT: go through engine entry, not executor directly
        const result = await run(body);

        res.json(result);
    } catch (err: any) {
        const response = handleError(err);
        res.status(response.status.code).json(response);
    }
});

export default router;
