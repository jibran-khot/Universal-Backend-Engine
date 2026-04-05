import { Router, Request, Response, NextFunction } from "express";
import { validateRequest } from "./core/validation/validator";
import { run } from "./core/run";
import { authMiddleware } from "./core/auth/auth.middleware";

const router = Router();

/**
 * Async wrapper to forward errors to global handler
 */
const asyncHandler =
    (fn: Function) =>
        (req: Request, res: Response, next: NextFunction) =>
            Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Universal procedure executor endpoint
 */
router.post(
    "/run",
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
        const body = validateRequest(req.body);

        /**
         * Inject auth context
         */
        (body as any).__auth = (req as any).__auth;
        (body as any).__token = (req as any).__token;

        /**
         * Inject request context (CRITICAL for logging/tracing)
         */
        (body as any).__context = (req as any).context;

        const result = await run(body);

        res.status(200).json(result);
    })
);

export default router;