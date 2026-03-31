/**
 * ============================= UNIVERSAL RESPONSE CONTRACT =============================
 *
 * Ye backend engine ka OUTPUT STANDARD define karta hai.
 *
 * Flow:
 *
 * SQL Server
 *     ↓
 * SQL Executor
 *     ↓
 * Response Contract (ye file)
 *     ↓
 * Angular / Client
 *
 * Purpose:
 * - Frontend ko SQL ka format samajhna na pade
 * - Har project me same response structure rahe
 * - Success / Error standard ho
 * - Logging aur debugging easy ho
 *
 * Agar ye stable hai → frontend kabhi break nahi hoga.
 *
 * =============================================================================
 */


/* -------------------------------------------------------------------------- */
/* STATUS OBJECT                                                              */
/* -------------------------------------------------------------------------- */

export interface ResponseStatus {
    code: number;
    success: boolean;
    message: string;
}


/* -------------------------------------------------------------------------- */
/* ERROR STRUCTURE                                                            */
/* -------------------------------------------------------------------------- */

export interface ResponseError {
    code: string;
    message: string;

    /**
     * Phase-3 engine intelligence fields
     */
    engine?: "sql" | "supabase" | "api";
    retryable?: boolean;
    type?: "SYSTEM" | "DATA" | "SECURITY" | "AUTH";

    /**
     * Debug / internal
     */
    details?: unknown;
}



/* -------------------------------------------------------------------------- */
/* DATASET STRUCTURE                                                          */
/* -------------------------------------------------------------------------- */

export interface DataSet {
    tables?: Record<string, unknown[]>;
    data?: unknown;
    output?: Record<string, unknown>;
}


/* -------------------------------------------------------------------------- */
/* META INFORMATION                                                           */
/* -------------------------------------------------------------------------- */

export interface ResponseMeta {
    requestId?: string;
    timestamp?: number;
    durationMs?: number;
    db?: "sql" | "supabase";
    companyDb?: string;
    procedure?: string;
}


/* -------------------------------------------------------------------------- */
/* MAIN RESPONSE OBJECT                                                       */
/* -------------------------------------------------------------------------- */

export interface EngineResponse<T = unknown> {

    status: ResponseStatus;

    data?: T | DataSet;

    error?: ResponseError;

    meta?: ResponseMeta;

    /**
     * OLD SUPPORT — existing frontend break nahi hoga
     */
    statusCode?: number;
    message?: string;
}
