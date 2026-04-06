import { Router, Request, Response, NextFunction } from "express";
import { validateRequest } from "./core/validation/validator";
import { run } from "./core/run";
import { authMiddleware } from "./core/auth/auth.middleware";

const router = Router();

/**
 * ============================================================
 * ASYNC HANDLER WRAPPER
 * ============================================================
 *
 * Purpose:
 * - Wrap async route handlers
 * - Automatically forward errors to Express global error handler
 *
 * Why needed:
 * Express does NOT catch async errors by default.
 * Without this → unhandled promise rejections / crashes
 */
const asyncHandler =
    (fn: Function) =>
        (req: Request, res: Response, next: NextFunction) =>
            Promise.resolve(fn(req, res, next)).catch(next);

/**
 * ============================================================
 * POST /api/run
 * ============================================================
 *
 * Universal Engine Endpoint
 *
 * Flow:
 * 1. Auth Middleware → attaches __auth and __token
 * 2. Validate Request → ensures contract correctness
 * 3. Inject context → auth + request tracing
 * 4. run() → core engine pipeline
 *
 * This is the ONLY entry point to backend execution.
 */
router.post(
    "/run",
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
        /**
         * STEP 1: VALIDATE REQUEST BODY
         *
         * Ensures request follows EngineRequest contract
         * Throws error if invalid
         */
        const body = validateRequest(req.body);

        /**
         * STEP 2: INJECT AUTH CONTEXT
         *
         * Provided by auth.middleware:
         * - __auth → decoded user/session
         * - __token → raw JWT
         *
         * Passed into engine for authorization and auditing
         */
        (body as any).__auth = (req as any).__auth;
        (body as any).__token = (req as any).__token;

        /**
         * STEP 3: INJECT REQUEST CONTEXT
         *
         * Contains:
         * - requestId → unique trace ID
         * - startTime → performance tracking
         *
         * Used across:
         * - logger
         * - executor
         * - error handler
         */
        (body as any).__context = (req as any).context;

        /**
         * STEP 4: EXECUTE ENGINE PIPELINE
         *
         * Delegates to run():
         * run → guard → resolver → executor
         */
        const result = await run(body);

        /**
         * STEP 5: SEND RESPONSE
         *
         * Assumes standardized response contract
         */
        res.status(200).json(result);
    })
);

export default router;