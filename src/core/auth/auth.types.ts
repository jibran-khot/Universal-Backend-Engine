/**
 * ============================= AUTH ENGINE TYPES =============================
 * Engine-level authentication context.
 * This is NOT app-specific (admin/user).
 * Works for:
 * - SQL auth
 * - Supabase auth
 * - future providers
 * =============================================================================
 */

export type AuthSource = "sql" | "supabase" | "system";

/**
 * Token payload (JWT decoded data)
 */
export interface TokenPayload {
    userId: string;
    sessionId: string;
    tenantId?: string;
    exp: number;
    iat: number;
    iss?: string;
}

/**
 * Authenticated identity resolved by engine
 */
export interface AuthIdentity {
    userId: string;
    sessionId: string;
    tenantId?: string;
    roles?: string[]; // future RBAC
    source: AuthSource;
}

/**
 * Execution auth context injected into engine pipeline
 */
export interface AuthContext {
    isAuthenticated: boolean;
    identity?: AuthIdentity;
    tokenExp?: number;
}
