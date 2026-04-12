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

function assertSqlContext(input: ExecutionInput): SqlExecutionPayload {
    const action = input.request.action as Record<string, unknown>;

    const dbName = action?.dbName;
    const payload = action?.payload;

    if (typeof dbName !== "string" || dbName.trim() === "") {
        throw new Error("INVALID_DB_CONTEXT");
    }

    return {
        dbName,
        payload,
    };
}

export async function runProcedure(
    input: ExecutionInput
): Promise<EngineResponse> {
    const start = Date.now();

    const { request, ctx, procedure, project } = input;

    try {
        const { dbName, payload } = assertSqlContext(input);

        const response = await runSqlProcedure(
            dbName,
            procedure,
            payload,
            project,
            request.action,
            request
        );

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
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "SQL_EXECUTION_FAILED";

        logger.error({
            requestId: ctx.requestId,
            engine: "sql",
            action: "SQL_EXECUTION_FAILURE",
            message,
            meta: err,
            project,
            procedure,
        });

        throw new Error("SQL_EXECUTION_FAILED");
    }
}