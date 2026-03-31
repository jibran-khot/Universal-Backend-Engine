/**
 * ============================= UNIVERSAL REQUEST CONTRACT =============================
 *
 * Ye file backend engine ka ENTRY GATE hai.
 * Angular / client jo bhi request bhejega — wo isi structure me hoga.
 *
 * Backend flow:
 *
 * Angular / Client
 *        ↓
 * Request Contract (ye file)
 *        ↓
 * DB Resolver (decide karega kaunsa DB hit hoga)
 *        ↓
 * SQL Executor (stored procedure execute karega)
 *        ↓
 * SQL Server
 *
 * Purpose:
 * - Har project same request structure use kare
 * - Multi-tenant support (companyDb switching)
 * - Auth + metadata + procedure ek standard format me aaye
 * - Future me modules add ho sake bina breaking change ke
 *
 * Ye sirf TYPE definition hai — koi business logic nahi.
 *
 * =============================================================================
 */


/* -------------------------------------------------------------------------- */
/* META SECTION                                                               */
/* -------------------------------------------------------------------------- */

export interface RequestMeta {
    requestId?: string;
    timestamp?: number;
    version?: string;
    source?: string;
}


/* -------------------------------------------------------------------------- */
/* AUTH SECTION                                                               */
/* -------------------------------------------------------------------------- */

export interface RequestAuth {
    token?: string;
    companyDb?: string;
    userId?: string;
}


/* -------------------------------------------------------------------------- */
/* ACTION SECTION                                                             */
/* -------------------------------------------------------------------------- */

export interface RequestAction {

    procedure: string;

    params?: Record<string, unknown>;

    form?: Record<string, unknown>;

    /**
     * Future:
     * admin/dev tools ke liye direct SQL
     */
    inlineSQL?: string;
}


/* -------------------------------------------------------------------------- */
/* BACKWARD COMPATIBILITY                                                     */
/* -------------------------------------------------------------------------- */

export interface EnginePayload {
    params?: Record<string, unknown>;
    data?: Record<string, unknown>;
}


/* -------------------------------------------------------------------------- */
/* MAIN REQUEST OBJECT                                                        */
/* -------------------------------------------------------------------------- */

export interface EngineRequest {

    project?: string;

    meta?: RequestMeta;

    auth?: RequestAuth;

    action: RequestAction;

    payload?: EnginePayload;
}
