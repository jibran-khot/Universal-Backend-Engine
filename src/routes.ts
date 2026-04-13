import { Router, Request, Response, NextFunction } from "express";
import { validateRequest } from "./core/validation/validator";
import { run } from "./core/run";
import { authMiddleware } from "./core/auth/auth.middleware";
import { ExecutionContext } from "./core/context";

const router = Router();

// ===============================
// TYPES (LOCAL SAFE EXTENSIONS)
// ===============================

type RequestWithMeta = Request & {
    __ctx?: ExecutionContext;
    __auth?: unknown;
    __token?: unknown;
};

// ===============================
// ASYNC HANDLER (STRICT)
// ===============================

const asyncHandler =
    (
        fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
    ) =>
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

        const metaReq = req as RequestWithMeta;

        // -------------------------------
        // STEP 2: BUILD EXECUTION PAYLOAD (IMMUTABLE)
        // -------------------------------
        const executionPayload = Object.freeze({
            ...body,
            __auth: metaReq.__auth,
            __token: metaReq.__token,
            __ctx: metaReq.__ctx,
        });

        // -------------------------------
        // STEP 3: EXECUTE
        // -------------------------------
        const result = await run(executionPayload);

        res.status(result.statusCode || 200).json(result);
    })
);

export default router;