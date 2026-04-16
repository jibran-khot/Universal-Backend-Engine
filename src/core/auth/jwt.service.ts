import jwt, { SignOptions } from "jsonwebtoken";
import { TokenPayload } from "./auth.types";

// ===============================
// CONSTANTS (STRICT)
// ===============================

function assertSecret(value: unknown): string {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error("ENV_ERROR: JWT_SECRET is required");
    }
    return value;
}

const SECRET = assertSecret(process.env.JWT_SECRET);
const ISSUER = "hybrid-db-engine";

// ===============================
// SIGN
// ===============================

export function signToken(payload: Omit<TokenPayload, "iat" | "exp">): string {

    const options: SignOptions = {
        expiresIn: "8h",
        issuer: ISSUER,
    };

    return jwt.sign(payload, SECRET, options);
}

// ===============================
// VERIFY
// ===============================

export function verifyToken(token: string): TokenPayload {

    try {
        const decoded = jwt.verify(token, SECRET, {
            issuer: ISSUER
        }) as TokenPayload;

        return decoded;

    } catch (err: unknown) {

        if (
            typeof err === "object" &&
            err !== null &&
            "name" in err &&
            err.name === "TokenExpiredError"
        ) {
            throw new Error("AUTH_ERROR");
        }

        throw new Error("AUTH_ERROR");
    }
}

// ===============================
// DECODE (NON-TRUSTED)
// ===============================

export function decodeToken(token: string): TokenPayload | null {
    try {
        const decoded = jwt.decode(token);

        if (typeof decoded !== "object" || decoded === null) {
            return null;
        }

        return decoded as TokenPayload;
    } catch {
        return null;
    }
}