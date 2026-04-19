import { EngineResponse } from "../contract/response";
import { runSqlProcedure } from "./sql.executor";
import { logger } from "../logger/logger";
import { ENV } from "../../config/env";

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

type SqlExecutionPayload = Readonly<{
    dbName: string;
    payload: {
        ParamObj: string;
        FormObj: string;
    };
}>;

// ===============================
// TYPE GUARD
// ===============================

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

// ===============================
// ASSERT SQL CONTEXT (FIXED)
// ===============================

function assertSqlContext(input: ExecutionInput): SqlExecutionPayload {
    const action = input.request.action;

    if (!isObject(action)) {
        throw new Error("INVALID_DB_CONTEXT");
    }

    const params = isObject(action["params"]) ? action["params"] : {};
    const form = isObject(action["form"]) ? action["form"] : {};

    // ✅ DB RESOLUTION (LOGIN → MASTER DB)
    let dbName = ENV.db.sqlserver.name;

    if (input.procedure === "AdminLoginProc") {
        dbName = ENV.engineDb.master; // EcomSetup
    }

    return Object.freeze({
        dbName,
        payload: {
            ParamObj: JSON.stringify(params),
            FormObj: JSON.stringify(form),
        },
    });
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
        const { dbName, payload } = assertSqlContext(input);

        const response = await runSqlProcedure({
            ctx,
            procedure,
            project,
            dbName,
            payload,
            action: request.action,
        });

        logger.sql({
            requestId: ctx.requestId,
            engine: "sql",
            action: "SQL_EXECUTION_SUCCESS",
            message: "SQL execution completed",
            durationMs: Date.now() - start,
            project,
            procedure,
            db: dbName,
        });

        return response;
    } catch (_err: unknown) {
        logger.error({
            requestId: ctx.requestId,
            engine: "sql",
            action: "SQL_EXECUTION_FAILURE",
            message: "SQL_EXECUTION_FAILED",
            meta: _err,
            project,
            procedure,
        });

        throw new Error("SQL_EXECUTION_FAILED");
    }
}