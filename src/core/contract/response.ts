/**
 * ============================= UNIVERSAL RESPONSE CONTRACT =============================
 *
 * PURPOSE:
 * - Backend → Frontend communication standard
 * - Stable structure across SQL / Supabase / API
 * - Ensures frontend never depends on DB-specific format
 *
 * IMPORTANT RULE:
 * - "status" is the source of truth
 * - "statusCode/message" are backward compatibility only
 *
 * =============================================================================
 */

/* -------------------------------------------------------------------------- */
/* STATUS OBJECT                                                              */
/* -------------------------------------------------------------------------- */

export interface ResponseStatus {
    readonly code: number;        // HTTP-like status
    readonly success: boolean;    // true/false
    readonly message: string;     // user-readable message
}


/* -------------------------------------------------------------------------- */
/* ERROR STRUCTURE                                                            */
/* -------------------------------------------------------------------------- */

export type ErrorEngine = "sql" | "supabase" | "api";

export type ErrorType =
    | "SYSTEM"
    | "DATA"
    | "SECURITY"
    | "AUTH";

export interface ResponseError {
    code: string;
    message: string;

    /**
     * Error classification
     */
    engine?: ErrorEngine;
    type?: ErrorType;

    /**
     * Retry hint (future circuit breaker use)
     */
    retryable?: boolean;

    /**
     * Debug / internal (never expose blindly to frontend)
     */
    details?: unknown;
}


/* -------------------------------------------------------------------------- */
/* DATASET STRUCTURE                                                          */
/* -------------------------------------------------------------------------- */

export interface DataSet {
    /**
     * Multi-table result (SQL style)
     * Example: { users: [], orders: [] }
     */
    tables?: Record<string, unknown[]>;

    /**
     * Single result / scalar / array
     */
    data?: unknown;

    /**
     * Output params (stored procedures)
     */
    output?: Record<string, unknown>;
}


/* -------------------------------------------------------------------------- */
/* META INFORMATION                                                           */
/* -------------------------------------------------------------------------- */

export interface ResponseMeta {
    requestId?: string;
    timestamp?: number;
    durationMs?: number;

    /**
     * Execution tracking
     */
    db?: "sql" | "supabase";
    companyDb?: string;
    procedure?: string;
}


/* -------------------------------------------------------------------------- */
/* MAIN RESPONSE OBJECT                                                       */
/* -------------------------------------------------------------------------- */

export interface EngineResponse<T = unknown> {

    /**
     * SOURCE OF TRUTH
     */
    status: ResponseStatus;

    /**
     * Data payload
     */
    data?: T | DataSet;

    /**
     * Error object (only when success=false)
     */
    error?: ResponseError;

    /**
     * Observability / tracing
     */
    meta?: ResponseMeta;

    /**
     * ----------------------------------------------------------------------
     * BACKWARD COMPATIBILITY (DO NOT USE IN NEW CODE)
     * ----------------------------------------------------------------------
     */

    statusCode?: number;
    message?: string;
}