/**
 * ============================================================
 * DATABASE RESOLVER
 * ============================================================
 */

import { EngineRequest } from "./contract/request";
import { getProcedureDb } from "./resolver/procedure.registry";
import { getEngineConfig } from "../config/engine.loader";
import { ENV } from "../config/env";
import { logger } from "./logger/logger";

// ===============================
// Types
// ===============================

type DbType = "MASTER" | "TENANT";

export interface ResolvedContext {
    project: string;
    dbName?: string;
    procedure: string;
    payload: {
        params: Record<string, unknown>;
        data: Record<string, unknown>;
    };
}

// ===============================
// Helpers
// ===============================

function isDbType(value: unknown): value is DbType {
    return value === "MASTER" || value === "TENANT";
}

function safeObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
}

// ===============================
// Resolver
// ===============================

export function resolveContext(input: EngineRequest): ResolvedContext {

    const ctx = (input as {
        __ctx?: { requestId?: string };
    })?.__ctx;

    // ===============================
    // STEP 1: LOAD ENGINE CONFIG
    // ===============================
    const engineConfig = getEngineConfig();

    if (!engineConfig?.database?.mapping) {
        throw new Error("SERVER_ERROR: Invalid engine configuration");
    }

    // ===============================
    // STEP 2: PROJECT
    // ===============================
    const project = input.project || ENV.project;

    if (!project) {
        throw new Error("INVALID_REQUEST: Project not provided");
    }

    // ===============================
    // STEP 3: PROCEDURE
    // ===============================
    const rawInput = input as unknown as Record<string, unknown>;

    let procedure: string | undefined;

    if (typeof input.action?.procedure === "string") {
        procedure = input.action.procedure;
    } else if (typeof rawInput["procedure"] === "string") {
        procedure = rawInput["procedure"] as string;
    }

    if (!procedure) {
        throw new Error("INVALID_REQUEST: Procedure name is required");
    }

    // ===============================
    // STEP 4: DB TYPE
    // ===============================
    const rawDbType = getProcedureDb(project, procedure);

    if (!isDbType(rawDbType)) {
        throw new Error(
            `SERVER_ERROR: Invalid DB type mapping for procedure: ${procedure}`
        );
    }

    const dbType = rawDbType;

    // ===============================
    // STEP 5: CONFIG VALIDATION
    // ===============================
    const mapping = engineConfig.database.mapping[dbType];

    if (!mapping) {
        throw new Error(
            `SERVER_ERROR: No DB mapping found for type: ${dbType}`
        );
    }

    // ===============================
    // STEP 6: DB NAME
    // ===============================
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

    // ===============================
    // STEP 7: PAYLOAD
    // ===============================
    const payload = {
        params: {
            ...safeObject(input.payload?.params),
            ...safeObject(input.action?.params),
        },
        data: {
            ...safeObject(input.payload?.data),
            ...safeObject(input.action?.form),
        },
    };

    // ===============================
    // STEP 8: DEBUG LOG
    // ===============================
    if (process.env.NODE_ENV === "development") {
        logger.debug({
            requestId: ctx?.requestId,
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