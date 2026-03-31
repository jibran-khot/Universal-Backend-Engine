import jwt, { SignOptions } from "jsonwebtoken";
import { TokenPayload } from "./auth.types";

const SECRET = process.env.JWT_SECRET || "engine_secret";
const ISSUER = "hybrid-db-engine";

/**
 * Sign access token
 * Used after successful login/session creation
 */
export function signToken(payload: Omit<TokenPayload, "iat" | "exp">): string {

    const options: SignOptions = {
        expiresIn: "8h",
        issuer: ISSUER,
    };

    return jwt.sign(payload, SECRET, options);
}


/**
 * Verify token integrity + expiry
 * Returns decoded payload if valid
 * Throws engine error if invalid
 */
export function verifyToken(token: string): TokenPayload {

    try {
        const decoded = jwt.verify(token, SECRET, {
            issuer: ISSUER
        }) as TokenPayload;

        return decoded;

    } catch (err: any) {

        if (err.name === "TokenExpiredError") {
            throw {
                type: "AUTH_TOKEN_EXPIRED",
                message: "Token expired"
            };
        }

        throw {
            type: "AUTH_INVALID_TOKEN",
            message: "Invalid token"
        };
    }
}


/**
 * Decode token WITHOUT validation
 * Used for logging / debugging / tracing
 */
export function decodeToken(token: string): TokenPayload | null {
    try {
        return jwt.decode(token) as TokenPayload;
    } catch {
        return null;
    }
}
