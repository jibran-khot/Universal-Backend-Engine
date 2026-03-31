/**
 * ============================= DATABASE RESOLVER =============================
 *
 * FINAL ENGINE RESOLVER
 *
 * DB resolution:
 * registry → engine.config → ENV.engineDb
 *
 * Context DB dependency removed.
 * Engine fully portable.
 * =============================================================================
 */

import { EngineRequest } from "./contract/request";
import { getProcedureDb } from "./resolver/procedure.registry";
import { getEngineConfig } from "../config/engine.loader";
import { ENV } from "../config/env";

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
 * Convert request into executor-friendly context
 */
export function resolveContext(input: EngineRequest): ResolvedContext {

    const engineConfig = getEngineConfig();

    // Project resolution
    const project = input.project || ENV.project;

    // Procedure resolution
    const procedure =
        input.action?.procedure ||
        (input as any)?.procedure;

    if (!procedure) {
        throw {
            type: "INVALID_REQUEST",
            message: "Procedure name is required in request"
        };
    }

    // ===============================
    // DATABASE DECISION — ENGINE DRIVEN
    // ===============================

    let dbName: string | undefined;

    // STEP 1: Get DB type from registry
    const dbType = getProcedureDb(project, procedure);
    // MASTER | TENANT

    // STEP 2: Get DB mapping from engine config
    const mapping = engineConfig.database.mapping[dbType];

    if (!mapping) {
        throw {
            type: "SERVER_ERROR",
            message: `No DB mapping found for type: ${dbType}`
        };
    }

    // STEP 3: Resolve actual DB name from ENV
    if (dbType === "MASTER") {
        dbName = ENV.engineDb.master;
    } else {
        dbName =
            input.auth?.companyDb ||
            ENV.engineDb.tenantDefault;
    }

    if (!dbName) {
        throw {
            type: "SERVER_ERROR",
            message: `Database name not resolved for type: ${dbType}`
        };
    }

    // ===============================
    // PAYLOAD NORMALIZATION
    // ===============================

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

    // ===============================
    // DEV LOGGING
    // ===============================

    if (process.env.NODE_ENV === "development") {
        console.log(
            "RESOLVER → PROJECT:", project,
            "| DB:", dbName,
            "| PROC:", procedure,
            "| TYPE:", dbType
        );
    }

    return {
        project,
        dbName,
        procedure,
        payload,
    };
}
