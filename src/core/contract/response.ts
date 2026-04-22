/**
 * ============================= UNIVERSAL RESPONSE CONTRACT =============================
 * PRODUCTION SAFE + STRICT IMMUTABILITY
 * =============================================================================
 */

/* -------------------------------------------------------------------------- */
/* STATUS OBJECT                                                              */
/* -------------------------------------------------------------------------- */

export interface ResponseStatus {
    readonly code: number;
    readonly success: boolean;
    readonly message: string;
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
    readonly code: string;
    readonly message: string;

    readonly engine?: ErrorEngine;
    readonly type?: ErrorType;

    readonly retryable?: boolean;

    readonly details?: unknown;
}

/* -------------------------------------------------------------------------- */
/* DATASET STRUCTURE                                                          */
/* -------------------------------------------------------------------------- */

export interface DataSet {
    readonly tables?: Readonly<Record<string, unknown[]>>;
    readonly data?: unknown;
    readonly output?: Readonly<Record<string, unknown>>;
}

/* -------------------------------------------------------------------------- */
/* META INFORMATION                                                           */
/* -------------------------------------------------------------------------- */

export interface ResponseMeta {
    readonly requestId?: string;
    readonly timestamp?: number;
    readonly durationMs?: number;

    readonly db?: "sql" | "supabase";
    readonly companyDb?: string;
    readonly procedure?: string;
}

/* -------------------------------------------------------------------------- */
/* MAIN RESPONSE OBJECT                                                       */
/* -------------------------------------------------------------------------- */

export interface EngineResponse<T = unknown> {
    readonly status: ResponseStatus;

    readonly data?: T | DataSet;

    readonly error?: ResponseError;

    readonly meta?: ResponseMeta;

    // backward compatibility
    readonly statusCode?: number;
    readonly message?: string;
}