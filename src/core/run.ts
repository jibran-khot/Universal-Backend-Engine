import { runProcedure } from "./executor/hybrid.executor";
import { EngineRequest } from "./contract/request";
import { guardProcedure } from "./security/procedure.guard";
import { ENV } from "../config/env";
import { createExecutionContext } from "./context";
import { logger } from "./logger/logger";
import { buildError } from "./utils/response.builder";

type ExecutionContext = Readonly<{
    requestId: string;
    startTime: number;
    auth?: unknown;
    token?: unknown;
}>;

type SafeRequest = Readonly<EngineRequest & { project: string }>;

type ExecutionInput = Readonly<{
    request: SafeRequest;
    ctx: ExecutionContext;
    procedure: string;
}>;

function resolveProject(request: EngineRequest): string {
    const project = request.project ?? ENV.project;
    if (typeof project !== "string" || project.trim() === "") {
        throw new Error("INVALID_PROJECT");
    }
    return project;
}

function resolveProcedure(request: EngineRequest): string {
    const procedure = request.action?.procedure;
    if (typeof procedure !== "string" || procedure.trim() === "") {
        throw new Error("INVALID_PROCEDURE");
    }
    return procedure;
}

function buildContext(request: EngineRequest): ExecutionContext {
    const base = createExecutionContext();

    const auth = "auth" in request ? request.auth : undefined;
    const token = "token" in request ? request.token : undefined;

    return Object.freeze({
        ...base,
        auth,
        token,
    });
}

function buildExecutionInput(request: EngineRequest): ExecutionInput {
    const project = resolveProject(request);
    const procedure = resolveProcedure(request);
    const ctx = buildContext(request);

    const safeRequest: SafeRequest = Object.freeze({
        ...request,
        project,
    });

    return Object.freeze({
        request: safeRequest,
        ctx,
        procedure,
    });
}

export async function run(request: EngineRequest) {
    let input: ExecutionInput;

    try {
        input = buildExecutionInput(request);

        logger.api({
            requestId: input.ctx.requestId,
            action: "API_REQUEST_START",
            message: "Incoming engine request",
            project: input.request.project,
            procedure: input.procedure,
        });

        guardProcedure(input.request.project, input.procedure);

        const response = await runProcedure({
            request: input.request,
            ctx: input.ctx,
            procedure: input.procedure,
        });

        logger.api({
            requestId: input.ctx.requestId,
            action: "API_RESPONSE_SUCCESS",
            message: "Engine response sent",
            durationMs: Date.now() - input.ctx.startTime,
            project: input.request.project,
            procedure: input.procedure,
        });

        return response;
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "UNHANDLED_ENGINE_ERROR";

        const requestId =
            input?.ctx?.requestId ?? "UNKNOWN_REQUEST_ID";

        logger.error({
            requestId,
            engine: "api",
            action: "API_EXECUTION_ERROR",
            message,
            meta: err,
        });

        return buildError(err);
    }
}