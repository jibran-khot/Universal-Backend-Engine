import { Request, Response, NextFunction } from "express";
import { EngineRequest } from "../contract/request";
import { AuthContext } from "./auth.types";
import { validateSession } from "./session.validator";
import { logger } from "../logger/logger";

// ===============================
// TYPES
// ===============================

type RequestWithAuth = Request & {
    __auth?: AuthContext;
    __token?: string;
    __ctx?: { requestId?: string };
};

// ===============================
// CONSTANTS
// ===============================

const PUBLIC_PROCEDURES = new Set<string>([
    "AdminLoginProc",
]);

// ===============================
// HELPERS
// ===============================

function extractToken(header: unknown): string | null {
    if (typeof header !== "string") return null;
    if (!header.startsWith("Bearer ")) return null;

    const token = header.slice(7).trim();
    return token.length > 0 ? token : null;
}

// ===============================
// MIDDLEWARE
// ===============================

export async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    const metaReq = req as RequestWithAuth;
    const requestId = metaReq.__ctx?.requestId;

    try {
        const requestBody = req.body as EngineRequest;
        const procedure = requestBody?.action?.procedure;

        if (typeof procedure !== "string" || procedure.trim() === "") {
            throw new Error("INVALID_REQUEST");
        }

        // ===============================
        // PUBLIC ROUTE BYPASS
        // ===============================
        if (PUBLIC_PROCEDURES.has(procedure)) {
            const context: AuthContext = Object.freeze({
                isAuthenticated: false,
            });

            metaReq.__auth = context;

            logger.info({
                requestId,
                engine: "auth",
                action: "AUTH_BYPASS",
                message: "Public procedure access",
                meta: { procedure },
            });

            return next();
        }

        // ===============================
        // TOKEN EXTRACTION (STRICT HEADER)
        // ===============================
        const token = extractToken(req.headers["authorization"]);

        if (!token) {
            throw new Error("AUTH_TOKEN_MISSING");
        }

        // ===============================
        // PROJECT RESOLUTION
        // ===============================
        const project =
            requestBody?.project ??
            process.env.PROJECT;

        if (typeof project !== "string" || project.trim() === "") {
            throw new Error("INVALID_PROJECT");
        }

        // ===============================
        // SESSION VALIDATION
        // ===============================
        const identity = await validateSession(token, project);

        // ===============================
        // CONTEXT ATTACHMENT (IMMUTABLE)
        // ===============================
        const context: AuthContext = Object.freeze({
            isAuthenticated: true,
            identity,
        });

        metaReq.__auth = context;
        metaReq.__token = token;

        logger.info({
            requestId,
            engine: "auth",
            action: "AUTH_SUCCESS",
            message: "Authentication successful",
            meta: { procedure, project },
        });

        next();

    } catch (err: unknown) {
        logger.error({
            requestId,
            engine: "auth",
            action: "AUTH_FAILURE",
            message:
                err instanceof Error ? err.message : "AUTH_ERROR",
            meta: err,
        });

        next(err);
    }
}