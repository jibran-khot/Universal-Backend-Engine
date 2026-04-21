import jwt, { SignOptions } from "jsonwebtoken";
import { TokenPayload } from "./auth.types";

// ===============================
// CONSTANTS (LAZY, NON-BLOCKING)
// ===============================

const ISSUER = "hybrid-db-engine";

function getSecret(): string | null {
    const v = process.env.JWT_SECRET;
    if (typeof v !== "string" || v.trim() === "") return null;
    return v;
}

// ===============================
// SIGN
// ===============================

export function signToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
    const SECRET = getSecret();
    if (!SECRET) {
        throw new Error("JWT_DISABLED"); // explicit, not ENV_ERROR
    }

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
    const SECRET = getSecret();
    if (!SECRET) {
        throw new Error("JWT_DISABLED");
    }

    try {
        const decoded = jwt.verify(token, SECRET, {
            issuer: ISSUER,
        }) as TokenPayload;

        return decoded;
    } catch {
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