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
        const flag = body.action.params?.flag;

        // -------------------------------
        // STEP 2: CONDITIONAL AUTH (STRICT)
        // -------------------------------
        const isLogin =
            procedure === "AdminLoginProc" &&
            flag === "Login";

        let metaReq = req as RequestWithMeta;

        if (!isLogin) {
            await authMiddleware(req, res, next);

            metaReq = req as RequestWithMeta;

            // ✅ FORCE TOKEN INTO PARAMS (single source of truth)
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