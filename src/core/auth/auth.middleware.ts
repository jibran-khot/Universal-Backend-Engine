import { Request, Response, NextFunction } from "express";
import { EngineRequest } from "../contract/request";
import { AuthContext } from "./auth.types";
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
    "AdminLoginProc",
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
        console.log("---- AUTH MIDDLEWARE START ----");

        const requestBody = req.body as EngineRequest;

        console.log("BODY:", JSON.stringify(requestBody, null, 2));

        const procedure = requestBody?.action?.procedure;
        console.log("PROCEDURE:", procedure);

        if (typeof procedure !== "string" || procedure.trim() === "") {
            console.log("ERROR: INVALID_REQUEST (procedure missing)");
            throw new Error("INVALID_REQUEST");
        }

        const reqWithAuth = req as RequestWithAuth;

        /**
         * PUBLIC PROCEDURE BYPASS
         */
        if (PUBLIC_PROCEDURES.includes(procedure)) {
            console.log("PUBLIC ROUTE - SKIPPING AUTH");

            const context: AuthContext = Object.freeze({
                isAuthenticated: false
            });

            reqWithAuth.__auth = context;
            return next();
        }

        /**
         * TOKEN EXTRACTION
         */
        console.log("HEADERS:", req.headers);

        const rawHeader = req.headers["authorization"];
        console.log("RAW AUTH HEADER:", rawHeader);

        const headerToken =
            typeof rawHeader === "string"
                ? rawHeader.replace("Bearer ", "")
                : undefined;

        console.log("HEADER TOKEN:", headerToken);

        const bodyToken = requestBody?.auth?.token;
        console.log("BODY TOKEN:", bodyToken);

        const token = bodyToken ?? headerToken;

        console.log("FINAL TOKEN USED:", token);

        if (typeof token !== "string" || token.trim() === "") {
            console.log("ERROR: AUTH_ERROR (token missing)");
            throw new Error("AUTH_ERROR");
        }

        /**
         * PROJECT RESOLUTION
         */
        const project =
            requestBody?.project ??
            process.env.PROJECT;

        console.log("PROJECT:", project);

        if (typeof project !== "string" || project.trim() === "") {
            console.log("ERROR: INVALID_PROJECT");
            throw new Error("INVALID_PROJECT");
        }

        /**
         * DB SESSION VALIDATION
         */
        console.log("VALIDATING SESSION...");

        const identity = await validateSession(token, project);

        console.log("SESSION VALID:", identity);

        /**
         * BUILD CONTEXT
         */
        const context: AuthContext = Object.freeze({
            isAuthenticated: true,
            identity
        });

        reqWithAuth.__auth = context;
        reqWithAuth.__token = token;

        console.log("AUTH CONTEXT ATTACHED");
        console.log("---- AUTH MIDDLEWARE END ----");

        next();

    } catch (err: unknown) {
        console.log("AUTH MIDDLEWARE ERROR:", err);
        next(err);
    }
}