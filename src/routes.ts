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
    __token?: string;
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
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

        // -------------------------------
        // STEP 1: VALIDATE REQUEST
        // -------------------------------
        const body = validateRequest(req.body);

        const procedure = body.action.procedure;

        // ✅ FIX: login detection (removed flag dependency)
        const isLogin = procedure === "AdminLoginProc";

        let metaReq = req as RequestWithMeta;

        // -------------------------------
        // STEP 2: CONDITIONAL AUTH (STRICT)
        // -------------------------------
        if (!isLogin) {

            // ✅ FIX: proper middleware execution (Promise wrapper)
            await new Promise<void>((resolve, reject) => {
                authMiddleware(req, res, (err?: unknown) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            metaReq = req as RequestWithMeta;

            // ✅ TOKEN INJECTION (STRICT)
            if (metaReq.__token) {
                body.action.params = Object.freeze({
                    ...(body.action.params || {}),
                    token: metaReq.__token,
                });
            } else {
                throw new Error("AUTH_ERROR");
            }
        }

        // -------------------------------
        // STEP 3: BUILD EXECUTION PAYLOAD (IMMUTABLE)
        // -------------------------------
        const executionPayload = Object.freeze({
            ...body,
            __auth: metaReq.__auth,
            __token: metaReq.__token,
            __ctx: metaReq.__ctx,
        });

        // -------------------------------
        // STEP 4: EXECUTE
        // -------------------------------
        const result = await run(executionPayload);

        res.status(result.statusCode || 200).json(result);
    })
);

export default router;