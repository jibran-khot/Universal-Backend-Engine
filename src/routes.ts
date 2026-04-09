import { Router, Request, Response, NextFunction } from "express";
import { validateRequest } from "./core/validation/validator";
import { run } from "./core/run";
import { authMiddleware } from "./core/auth/auth.middleware";
import { ExecutionContext } from "./core/context";

const router = Router();

// ===============================
// ASYNC HANDLER
// ===============================

const asyncHandler =
    (fn: Function) =>
        (req: Request, res: Response, next: NextFunction) =>
            Promise.resolve(fn(req, res, next)).catch(next);

// ===============================
// POST /api/run
// ===============================

router.post(
    "/run",
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {

        // -------------------------------
        // STEP 1: VALIDATE REQUEST
        // -------------------------------
        const body = validateRequest(req.body);

        const rawReq = req as unknown as {
            __ctx?: ExecutionContext;
            __auth?: unknown;
            __token?: unknown;
        };

        const mutableBody = body as unknown as Record<string, unknown>;

        mutableBody.__auth = rawReq.__auth;
        mutableBody.__token = rawReq.__token;
        mutableBody.__ctx = rawReq.__ctx;

        const result = await run(body);
        // -------------------------------
        // STEP 5: SEND RESPONSE (FIXED 🔥)
        // -------------------------------
        res
            .status(result.statusCode || 200)
            .json(result);
    })
);

export default router;