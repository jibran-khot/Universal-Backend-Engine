import { Request, Response, NextFunction } from "express";
import { EngineRequest } from "../contract/request";
import { AuthContext } from "./auth.types";
import { verifyToken } from "./jwt.service";
import { validateSession } from "./session.validator";

// ===============================
// TYPES
// ===============================

type RequestWithAuth = Request & {
    __auth?: AuthContext;
    __token?: string;
};

// ===============================
// CONSTANTS
// ===============================

const PUBLIC_PROCEDURES = [
    "auth.login",
];

// ===============================
// MIDDLEWARE
// ===============================

export async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    try {

        const requestBody = req.body as EngineRequest;
        const procedure = requestBody?.action?.procedure;

        if (typeof procedure !== "string" || procedure.trim() === "") {
            throw new Error("INVALID_REQUEST");
        }

        const reqWithAuth = req as RequestWithAuth;

        /**
         * PUBLIC PROCEDURE BYPASS
         */
        if (PUBLIC_PROCEDURES.includes(procedure)) {

            const context: AuthContext = Object.freeze({
                isAuthenticated: false
            });

            reqWithAuth.__auth = context;
            return next();
        }

        /**
         * TOKEN EXTRACTION
         */
        const headerToken =
            typeof req.headers["authorization"] === "string"
                ? req.headers["authorization"].replace("Bearer ", "")
                : undefined;

        const token =
            requestBody?.auth?.token ??
            headerToken;

        if (typeof token !== "string" || token.trim() === "") {
            throw new Error("AUTH_ERROR");
        }

        /**
         * JWT VERIFICATION
         */
        const decoded = verifyToken(token);

        /**
         * PROJECT RESOLUTION (STRICT)
         */
        const project =
            requestBody?.project ??
            decoded?.tenantId;

        if (typeof project !== "string" || project.trim() === "") {
            throw new Error("INVALID_PROJECT");
        }

        /**
         * SQL SESSION VALIDATION
         */
        const identity = await validateSession(token, project);

        /**
         * BUILD CONTEXT (IMMUTABLE)
         */
        const context: AuthContext = Object.freeze({
            isAuthenticated: true,
            identity,
            tokenExp: decoded.exp
        });

        reqWithAuth.__auth = context;
        reqWithAuth.__token = token;

        next();

    } catch (err: unknown) {
        next(err);
    }
}