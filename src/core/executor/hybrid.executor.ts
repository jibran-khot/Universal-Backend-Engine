/**
 * Hybrid Executor
 * -------------------------------------------------------
 * Decides which DB engine to use (SQL / Supabase),
 * executes procedure, and manages engine caching.
 *
 * RULES:
 * - No business logic here
 * - No validation here
 * - Only execution + orchestration
 * - Must return EngineResponse (no throwing unless critical)
 */

import { EngineRequest } from "../contract/request";
import { EngineResponse } from "../contract/response";
import { resolveContext } from "../resolver";
import { runSqlProcedure } from "./sql.executor";
import { runSupabaseProcedure } from "./supabase.executor";
import { logger } from "../logger/logger";

// ===============================
// TYPES
// ===============================

type DbEngine = "sql" | "supabase";

interface ExecutionContext {
    requestId?: string;
    engine?: DbEngine;
}

// ===============================
// DB MODE CACHE (per project)
// ===============================

const DB_CACHE: Record<string, DbEngine> = {};

// ===============================
// MAIN EXECUTOR
// ===============================

export async function runProcedure(
    input: EngineRequest
): Promise<EngineResponse> {

    const start = Date.now();

    // Typed execution context
    const execCtx = (input as EngineRequest & { __ctx?: ExecutionContext }).__ctx;

    // Resolve request context
    const ctx = resolveContext(input);
    const { project, dbName, procedure, payload } = ctx;

    const cachedMode = project ? DB_CACHE[project] : undefined;

    // ===============================
    // 1️⃣ CACHED SQL EXECUTION
    // ===============================

    if (cachedMode === "sql" && dbName) {
        try {
            execCtx && (execCtx.engine = "sql");

            const res = await runSqlProcedure(
                dbName,
                procedure,
                payload,
                project,
                input.action,
                input
            );

            logger.sql({
                requestId: execCtx?.requestId,
                action: "HYBRID_SQL_CACHED",
                message: "SQL execution via cached engine",
                durationMs: Date.now() - start,
                project,
                procedure,
                db: dbName,
            });

            return res;

        } catch (err: unknown) {

            logger.error({
                requestId: execCtx?.requestId,
                engine: "sql",
                action: "HYBRID_SQL_CACHED_FAILURE",
                message: err instanceof Error ? err.message : "SQL cached execution failed",
                project,
                procedure,
                db: dbName,
                meta: err,
            });

            // continue to fresh selection
        }
    }

    // ===============================
    // 2️⃣ PRIMARY SQL EXECUTION
    // ===============================

    if (dbName) {
        try {
            execCtx && (execCtx.engine = "sql");

            const res = await runSqlProcedure(
                dbName,
                procedure,
                payload,
                project,
                input.action,
                input
            );

            // Cache success
            if (project) {
                DB_CACHE[project] = "sql";
            }

            logger.sql({
                requestId: execCtx?.requestId,
                action: "HYBRID_SQL_SELECTED",
                message: "SQL selected as execution engine",
                durationMs: Date.now() - start,
                project,
                procedure,
                db: dbName,
            });

            return res;

        } catch (err: unknown) {

            logger.error({
                requestId: execCtx?.requestId,
                engine: "sql",
                action: "HYBRID_SQL_FAILURE",
                message: err instanceof Error ? err.message : "SQL execution failed",
                project,
                procedure,
                db: dbName,
                meta: err,
            });

            // fallthrough (future: supabase)
        }
    }

    // ===============================
    // 3️⃣ SUPABASE FALLBACK (DISABLED)
    // ===============================
    /*
    try {
        execCtx && (execCtx.engine = "supabase");

        const res = await runSupabaseProcedure(
            procedure,
            payload,
            project,
            input
        );

        if (project) {
            DB_CACHE[project] = "supabase";
        }

        logger.supabase({
            requestId: execCtx?.requestId,
            action: "HYBRID_SUPABASE_SELECTED",
            message: "Supabase selected as execution engine",
            durationMs: Date.now() - start,
            project,
            procedure,
        });

        return res;

    } catch (err: unknown) {

        logger.error({
            requestId: execCtx?.requestId,
            engine: "supabase",
            action: "HYBRID_SUPABASE_FAILURE",
            message: err instanceof Error ? err.message : "Supabase execution failed",
            project,
            procedure,
            meta: err,
        });
    }
    */

    // ===============================
    // FINAL FAILURE (CONTROLLED)
    // ===============================

    return {
        status: {
            code: 500,
            success: false,
            message: "Execution failed: SQL unavailable and Supabase fallback disabled",
        },
        data: null,
        error: {
            code: "EXECUTION_FAILED",
            message: "SQL execution failed and fallback is disabled",
            engine: "sql",
            type: "SYSTEM",
            retryable: false,
        },
        meta: {
            requestId: execCtx?.requestId,
            timestamp: Date.now(),
            durationMs: Date.now() - start,
            db: "sql",
            procedure,
            tenantId: ctx.tenantId
        },
        // backward compatibility
        statusCode: 500,
        message: "Execution failed",
    };
}