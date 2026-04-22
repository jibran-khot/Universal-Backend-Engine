import { Router, Request, Response, NextFunction } from "express";
import { validateRequest } from "./core/validation/validator";
import { run } from "./core/run";
import { authMiddleware } from "./core/auth/auth.middleware";
import { ExecutionContext } from "./core/context";
import { logger } from "./core/logger/logger";

const router = Router();

// ===============================
// TYPES
// ===============================

type RequestWithMeta = Request & {
    __ctx?: ExecutionContext;
    __auth?: unknown;
    __token?: string;
};

// ===============================
// ASYNC HANDLER
// ===============================

const asyncHandler =
    (
        fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
    ) =>
        (req: Request, res: Response, next: NextFunction) =>
            Promise.resolve(fn(req, res, next)).catch(next);

// ===============================
// CONSTANTS
// ===============================

const LOGIN_PROCEDURES = new Set<string>(["AdminLoginProc"]);

// ===============================
// POST /api/run
// ===============================

router.post(
    "/run",
    asyncHandler(async (req: Request, res: Response) => {
        const metaReq = req as RequestWithMeta;
        const ctx = metaReq.__ctx;

        // -------------------------------
        // STEP 1: VALIDATE REQUEST
        // -------------------------------
        const body = validateRequest(req.body);
        const procedure = body.action.procedure;

        const isLogin = LOGIN_PROCEDURES.has(procedure);

        logger.info({
            requestId: ctx?.requestId,
            message: "REQUEST_VALIDATED",
            meta: { procedure, isLogin },
        });

        let finalAction = body.action;

        // -------------------------------
        // STEP 2: CONDITIONAL AUTH
        // -------------------------------
        if (!isLogin) {
            await new Promise<void>((resolve, reject) => {
                authMiddleware(req, res, (err?: unknown) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            if (!metaReq.__token) {
                throw new Error("AUTH_TOKEN_MISSING");
            }

            // ✅ FIX: DO NOT MUTATE → CREATE NEW OBJECT
            finalAction = Object.freeze({
                ...body.action,
                params: Object.freeze({
                    ...(body.action.params || {}),
                    token: metaReq.__token,
                }),
            });
        }

        // -------------------------------
        // STEP 3: BUILD EXECUTION PAYLOAD
        // -------------------------------
        const executionPayload = Object.freeze({
            ...body,
            action: finalAction, // ✅ FIXED
            __auth: metaReq.__auth,
            __token: metaReq.__token,
            __ctx: ctx,
        });

        // -------------------------------
        // STEP 4: EXECUTE
        // -------------------------------
        const result = await run(executionPayload);

        logger.info({
            requestId: ctx?.requestId,
            message: "REQUEST_EXECUTED",
            meta: {
                procedure,
                statusCode: result.statusCode,
            },
        });

        res.status(result.statusCode || 200).json(result);
    })
);

export default router;