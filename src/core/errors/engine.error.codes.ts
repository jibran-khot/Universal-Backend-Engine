/**
 * ============================================================
 * ENGINE ERROR REGISTRY
 * ============================================================
 *
 * Centralized error definitions for the entire backend engine.
 *
 * Used by:
 * - SQL executor
 * - Guard
 * - Auth system
 * - Resolver
 * - Supabase executor
 *
 * Prefix standard: E_
 * ============================================================
 */

export const ENGINE_ERROR_CODES = {

    // =========================
    // SQL ERRORS
    // =========================

    SQL_DIVIDE_BY_ZERO: "E_SQL_DIVIDE_BY_ZERO",
    SQL_DUPLICATE_KEY: "E_SQL_DUPLICATE_KEY",
    SQL_FOREIGN_KEY_CONSTRAINT: "E_SQL_FOREIGN_KEY_CONSTRAINT",
    SQL_PROCEDURE_NOT_FOUND: "E_SQL_PROCEDURE_NOT_FOUND",
    SQL_TIMEOUT: "E_SQL_TIMEOUT",
    SQL_EXECUTION_ERROR: "E_SQL_EXECUTION_ERROR",


    // =========================
    // GUARD / SECURITY ERRORS
    // =========================

    PROCEDURE_NOT_ALLOWED: "E_PROCEDURE_NOT_ALLOWED",
    INVALID_REQUEST: "E_INVALID_REQUEST",


    // =========================
    // AUTH ERRORS (Phase-3 Step-3)
    // =========================

    AUTH_INVALID_CREDENTIALS: "E_AUTH_INVALID_CREDENTIALS",
    AUTH_TOKEN_EXPIRED: "E_AUTH_TOKEN_EXPIRED",
    AUTH_UNAUTHORIZED: "E_AUTH_UNAUTHORIZED",


    // =========================
    // RESOLVER ERRORS
    // =========================

    PROJECT_NOT_FOUND: "E_PROJECT_NOT_FOUND",
    TENANT_NOT_FOUND: "E_TENANT_NOT_FOUND",
    DB_NOT_RESOLVED: "E_DB_NOT_RESOLVED",


    // =========================
    // SUPABASE ERRORS (future)
    // =========================

    SUPABASE_EXECUTION_ERROR: "E_SUPABASE_EXECUTION_ERROR",

} as const;
