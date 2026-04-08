/**
 * ============================= UNIVERSAL REQUEST CONTRACT =============================
 *
 * ENTRY POINT of backend engine.
 * All client requests MUST conform to this structure.
 *
 * FLOW:
 * Client → Request Contract → Resolver → Executor → Database
 *
 * DESIGN PRINCIPLES:
 * - Strict contract enforcement
 * - Multi-tenant ready
 * - No business logic
 * - Forward compatible
 * - Immutable input
 *
 * =============================================================================
 */


/* -------------------------------------------------------------------------- */
/* META SECTION                                                               */
/* -------------------------------------------------------------------------- */

export interface RequestMeta {
    readonly requestId?: string;
    readonly timestamp?: number;
    readonly version?: string;
    readonly source?: string;

    /**
     * Future extensibility (feature flags, tracing, etc.)
     */
    readonly context?: Record<string, unknown>;
}


/* -------------------------------------------------------------------------- */
/* AUTH / TENANT SECTION                                                      */
/* -------------------------------------------------------------------------- */

export interface RequestAuth {
    readonly token?: string;

    /**
     * Logical tenant identifier
     * Resolver maps this → actual DB
     */
    readonly tenantId?: string;

    readonly userId?: string;
}


/* -------------------------------------------------------------------------- */
/* ACTION SECTION (PRIMARY EXECUTION UNIT)                                     */
/* -------------------------------------------------------------------------- */

export interface RequestAction {

    /**
     * Stored procedure name
     */
    readonly procedure: string;

    /**
     * Input parameters for procedure
     */
    readonly params?: Record<string, unknown>;

    /**
     * Form-style payload (UI driven)
     */
    readonly form?: Record<string, unknown>;

    /**
     * ⚠️ Restricted usage
     * Only for admin/dev tools (must be guarded)
     */
    readonly inlineSQL?: string;
}


/* -------------------------------------------------------------------------- */
/* BACKWARD COMPATIBILITY (DEPRECATED)                                        */
/* -------------------------------------------------------------------------- */

export interface EnginePayload {

    /**
     * @deprecated Use action.params instead
     */
    readonly params?: Record<string, unknown>;

    /**
     * @deprecated Use action.form instead
     */
    readonly data?: Record<string, unknown>;
}


/* -------------------------------------------------------------------------- */
/* MAIN REQUEST OBJECT                                                        */
/* -------------------------------------------------------------------------- */

export interface EngineRequest {

    /**
     * Project identifier (required for routing/config)
     */
    readonly project: string;

    readonly meta?: RequestMeta;

    readonly auth?: RequestAuth;

    /**
     * Core execution definition
     */
    readonly action: RequestAction;

    /**
     * @deprecated Legacy support only
     */
    readonly payload?: EnginePayload;
}