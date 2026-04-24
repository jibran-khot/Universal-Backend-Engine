/**
 * ============================= UNIVERSAL REQUEST CONTRACT =============================
 * PRODUCTION SAFE + EXTENSIBLE
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

    params?: Readonly<Record<string, unknown>>;

    form?: Readonly<Record<string, unknown>>;

    /**
     * Future: admin/dev tools
     */
    inlineSQL?: string;
}

/* -------------------------------------------------------------------------- */
/* BACKWARD COMPATIBILITY                                                     */
/* -------------------------------------------------------------------------- */

export interface EnginePayload {
    params?: Readonly<Record<string, unknown>>;
    data?: Readonly<Record<string, unknown>>;
}

/* -------------------------------------------------------------------------- */
/* MAIN REQUEST OBJECT                                                        */
/* -------------------------------------------------------------------------- */

export interface EngineRequest {
    project?: string;

    meta?: Readonly<RequestMeta>;

    auth?: Readonly<RequestAuth>;

    action: Readonly<RequestAction>;

    payload?: Readonly<EnginePayload>;
}
export interface EngineRequestxd {
    project?: string;

    meta?: Readonly<RequestMeta>;

    auth?: Readonly<RequestAuth>;

    action: Readonly<RequestAction>;

    payload?: Readonly<EnginePayload>;
}