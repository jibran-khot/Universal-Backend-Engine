import { EngineResponse } from "../contract/response";
import { runSqlProcedure } from "./sql.executor";
import { logger } from "../logger/logger";
import { ENV } from "../../config/env";
import { getProcedureDb } from "../resolver/procedure.registry"; // ✅ ADD

type ExecutionInput = Readonly<{
    request: Readonly<{
        project: string;
        action: unknown;
    }>;
    ctx: Readonly<{
        requestId: string;
        startTime: number;
    }>;
    procedure: string;
    project: string;
}>;

// ===============================
// HELPERS
// ===============================

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ===============================
// EXECUTION
// ===============================

export async function runProcedure(
    input: ExecutionInput
): Promise<EngineResponse> {
    const start = Date.now();

    const { request, ctx, procedure, project } = input;

    try {
        if (!isObject(request.action)) {
            throw new Error("INVALID_ACTION");
        }

        // ===============================
        // ✅ FIX: DYNAMIC DB RESOLUTION
        // ===============================
        const dbType = getProcedureDb(project, procedure);

        let dbName =
            dbType === "MASTER"
                ? ENV.engineDb.master
                : ENV.db.sqlserver.name;

        const response = await runSqlProcedure({
            ctx,
            procedure,
            project,
            dbName,
            payload: request.action,
            action: request.action,
        });

        logger.sql({
            requestId: ctx.requestId,
            action: "HYBRID_EXECUTION_SUCCESS",
            message: "Procedure executed via SQL",
            durationMs: Date.now() - start,
            project,
            procedure,
            db: dbName,
        });

        return response;

    } catch (err: unknown) {
        logger.error({
            requestId: ctx.requestId,
            engine: "sql",
            action: "HYBRID_EXECUTION_FAILED",
            message:
                err instanceof Error
                    ? err.message
                    : "SQL_EXECUTION_FAILED",
            meta: err,
            project,
            procedure,
            durationMs: Date.now() - start,
        });

        throw err;
    }
}