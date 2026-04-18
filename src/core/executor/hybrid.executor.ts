import { EngineResponse } from "../contract/response";
import { runSqlProcedure } from "./sql.executor";
import { logger } from "../logger/logger";

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
    payload: unknown;
}>;

// ===============================
// TYPE GUARD
// ===============================

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

// ===============================
// ASSERT SQL CONTEXT (STRICT)
// ===============================

function assertSqlContext(input: ExecutionInput): SqlExecutionPayload {
    const action = input.request.action;

    if (!isObject(action)) {
        throw new Error("INVALID_DB_CONTEXT");
    }

    const dbName = action["dbName"];
    const payload = action["payload"];

    if (typeof dbName !== "string" || dbName.trim() === "") {
        throw new Error("INVALID_DB_CONTEXT");
    }

    return Object.freeze({
        dbName,
        payload,
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
        // DO NOT leak internal error messages (deterministic output)

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