import { Request, Response, NextFunction } from "express";
import { EngineRequest } from "../contract/request";
import { AuthContext } from "./auth.types";
import { verifyToken } from "./jwt.service";
import { validateSession } from "./session.validator";

/**
 * Authentication middleware (engine-level)
 * Flow:
 * detect procedure → bypass login → extract token
 * → verify JWT → validate SQL session → attach identity
 */

const PUBLIC_PROCEDURES = [
    "auth.login",   // update if your login procedure name differs
];

export async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    try {

        const body = req.body as EngineRequest;
        const procedure = body?.action?.procedure;

        if (!procedure) {
            throw {
                type: "INVALID_REQUEST",
                message: "Procedure missing in request"
            };
        }

        /**
         * PUBLIC PROCEDURE BYPASS
         * Login, forgot-password etc.
         */
        if (PUBLIC_PROCEDURES.includes(procedure)) {

            const context: AuthContext = {
                isAuthenticated: false
            };

            (req as any).__auth = context;
            return next();
        }

        /**
         * TOKEN EXTRACTION
         * Contract first → header fallback
         */
        const token =
            body?.auth?.token ||
            req.headers["authorization"]?.toString().replace("Bearer ", "");

        if (!token) {
            throw {
                type: "AUTH_UNAUTHORIZED",
                message: "Token missing"
            };
        }

        /**
         * JWT VERIFICATION
         */
        const decoded = verifyToken(token);

        /**
         * Resolve project (needed for SQL session validation)
         */
        const project =
            body?.project ||
            decoded?.tenantId ||
            process.env.PROJECT;

        /**
         * SQL SESSION VALIDATION (source of truth)
         */
        if (!project) {
            throw {
                type: "INVALID_REQUEST",
                message: "Project/Tenant context missing"
            };
        }

        const identity = await validateSession(token, project as string);

        /**
         * Build final auth context
         */
        const context: AuthContext = {
            isAuthenticated: true,
            identity,
            tokenExp: decoded.exp
        };

        /**
         * Attach to request → consumed by run() → injected into ctx
         */
        (req as any).__auth = context;
        (req as any).__token = token;

        next();

    } catch (err) {
        next(err);
    }
}
