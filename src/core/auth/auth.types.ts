/**
 * ============================= AUTH ENGINE TYPES =============================
 * Engine-level authentication context.
 * =============================================================================
 */

export type AuthSource = "sql" | "supabase" | "system";

/**
 * Token payload (JWT decoded data)
 */
export type TokenPayload = Readonly<{
    userId: string;
    sessionId: string;
    tenantId?: string;
    exp: number;
    iat: number;
    iss?: string;
}>;

/**
 * Authenticated identity resolved by engine
 */
export type AuthIdentity = Readonly<{
    userId: string;
    sessionId: string;
    tenantId?: string;
    roles?: ReadonlyArray<string>;
    source: AuthSource;
}>;

/**
 * Execution auth context injected into engine pipeline
 */
export type AuthContext = Readonly<{
    isAuthenticated: boolean;
    identity?: AuthIdentity;
    tokenExp?: number;
}>;