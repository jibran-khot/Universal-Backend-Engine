/**
 * ============================================================
 * DATABASE RESOLVER
 * ============================================================
 *
 * Purpose:
 * - Resolve which database to use for a given request
 * - Convert EngineRequest → executor-friendly context
 *
 * Flow:
 * run → resolver → executor
 *
 * DB Resolution Strategy:
 * 1. procedure.registry → determines DB type (MASTER / TENANT)
 * 2. engine.config → validates mapping
 * 3. ENV → resolves actual database name
 */

import { EngineRequest } from "./contract/request";
import { getProcedureDb } from "./resolver/procedure.registry";
import { getEngineConfig } from "../config/engine.loader";
import { ENV } from "../config/env";
import { logger } from "./logger/logger";

export interface ResolvedContext {
    project: string;
    dbName?: string;
    procedure: string;
    payload: {
        params?: Record<string, unknown>;
        data?: Record<string, unknown>;
    };
}

/**
 * ============================================================
 * RESOLVE CONTEXT
 * ============================================================
 *
 * Converts request into execution-ready format
 *
 * Output is consumed by:
 * - sql.executor
 * - supabase.executor
 */
export function resolveContext(input: EngineRequest): ResolvedContext {
    /**
     * STEP 1: LOAD ENGINE CONFIG
     */
    const engineConfig = getEngineConfig();

    /**
     * STEP 2: RESOLVE PROJECT
     */
    const project = input.project || ENV.project;

    if (!project) {
        throw new Error("INVALID_REQUEST: Project not provided");
    }

    /**
     * STEP 3: RESOLVE PROCEDURE
     */
    const procedure =
        input.action?.procedure ||
        (input as any)?.procedure;

    if (!procedure || typeof procedure !== "string") {
        throw new Error("INVALID_REQUEST: Procedure name is required");
    }

    /**
     * ============================================================
     * STEP 4: DATABASE TYPE RESOLUTION
     * ============================================================
     *
     * Source:
     * platform/<project>/procedures.json
     */
    const dbType = getProcedureDb(project, procedure); // MASTER | TENANT

    /**
     * STEP 5: VALIDATE ENGINE CONFIG MAPPING
     */
    const mapping = engineConfig?.database?.mapping?.[dbType];

    if (!mapping) {
        throw new Error(
            `SERVER_ERROR: No DB mapping found for type: ${dbType}`
        );
    }

    /**
     * ============================================================
     * STEP 6: RESOLVE DATABASE NAME
     * ============================================================
     */
    let dbName: string | undefined;

    if (dbType === "MASTER") {
        dbName = ENV.engineDb.master;
    } else {
        dbName =
            input.auth?.companyDb ||
            ENV.engineDb.tenantDefault;
    }

    if (!dbName) {
        throw new Error(
            `SERVER_ERROR: Database not resolved for type: ${dbType}`
        );
    }

    /**
     * ============================================================
     * STEP 7: PAYLOAD NORMALIZATION
     * ============================================================
     *
     * Ensures executor always receives consistent structure
     */
    const payload = {
        params:
            input.action?.params ||
            input.payload?.params ||
            {},

        data:
            input.action?.form ||
            input.payload?.data ||
            {},
    };

    /**
     * ============================================================
     * STEP 8: DEBUG LOGGING (DEV ONLY)
     * ============================================================
     */
    if (process.env.NODE_ENV === "development") {
        logger.debug({
            engine: "system",
            action: "RESOLVER_OUTPUT",
            message: "Resolved DB context",
            meta: {
                project,
                dbName,
                procedure,
                dbType,
            },
        });
    }

    return {
        project,
        dbName,
        procedure,
        payload,
    };
}