/**
 * Hybrid Executor
 * ----------------------------------------------------------------------------
 * जिम्मेदारी:
 * - सही execution engine select करना (SQL-first)
 * - execution delegate करना
 * - logging + caching handle करना
 *
 * IMPORTANT:
 * - कोई business logic नहीं
 * - guard पहले ही run.ts में execute हो चुका है
 * - executor सिर्फ execution layer है
 */

import { EngineRequest } from "../contract/request";
import { EngineResponse } from "../contract/response";
import { resolveContext } from "../resolver";
import { runSqlProcedure } from "./sql.executor";
import { runSupabaseProcedure } from "./supabase.executor";
import { logger } from "../logger/logger";

// ===============================
// Types
// ===============================

type EngineType = "sql" | "supabase";

interface ExecutionContext {
    requestId?: string;
    engine?: EngineType;
}

// ===============================
// DB MODE CACHE (per project)
// ===============================

const DB_CACHE: Record<string, EngineType> = {};

// ===============================
// Main Executor
// ===============================

export async function runProcedure(
    input: EngineRequest
): Promise<EngineResponse> {

    const start = Date.now();

    // Safe context extraction
    const execCtx: ExecutionContext = (input as unknown as {
        __ctx?: ExecutionContext;
    }).__ctx || {};

    // Resolve execution context
    const ctx = resolveContext(input);
    const { project, dbName, procedure, payload } = ctx;

    // Defensive validation (fail fast)
    if (!project || !procedure) {
        throw {
            type: "INVALID_CONTEXT",
            message: "Missing project or procedure in execution context",
        };
    }

    const cachedMode = DB_CACHE[project];

    // ===============================
    // 1. Cached SQL Execution
    // ===============================
    if (cachedMode === "sql" && dbName) {
        try {
            execCtx.engine = "sql";

            const res = await runSqlProcedure(
                dbName,
                procedure,
                payload,
                project,
                input.action,
                input
            );

            logger.sql({
                requestId: execCtx.requestId,
                engine: "sql",
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
                requestId: execCtx.requestId,
                engine: "sql",
                action: "HYBRID_SQL_CACHED_FAILURE",
                message: "Cached SQL execution failed",
                project,
                procedure,
                db: dbName,
                meta: err,
            });

            // fallthrough to fresh SQL attempt
        }
    }

    // ===============================
    // 2. Fresh SQL Execution (Primary)
    // ===============================
    if (dbName) {
        try {
            execCtx.engine = "sql";

            const res = await runSqlProcedure(
                dbName,
                procedure,
                payload,
                project,
                input.action,
                input
            );

            // Cache success
            DB_CACHE[project] = "sql";

            logger.sql({
                requestId: execCtx.requestId,
                engine: "sql",
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
                requestId: execCtx.requestId,
                engine: "sql",
                action: "HYBRID_SQL_FAILURE",
                message: "SQL execution failed",
                project,
                procedure,
                db: dbName,
                meta: err,
            });

            // Since fallback disabled → throw with context
            throw {
                type: "SQL_EXECUTION_FAILED",
                message: "SQL execution failed and no fallback available",
                meta: err,
            };
        }
    }

    // ===============================
    // 3. Supabase Fallback (Disabled)
    // ===============================
    /*
    try {
        execCtx.engine = "supabase";

        const res = await runSupabaseProcedure(
            procedure,
            payload,
            project,
            input
        );

        DB_CACHE[project] = "supabase";

        logger.supabase({
            requestId: execCtx.requestId,
            engine: "supabase",
            action: "HYBRID_SUPABASE_SELECTED",
            message: "Supabase selected as execution engine",
            durationMs: Date.now() - start,
            project,
            procedure,
        });

        return res;

    } catch (err: unknown) {

        logger.error({
            requestId: execCtx.requestId,
            engine: "supabase",
            action: "HYBRID_SUPABASE_FAILURE",
            message: "Supabase execution failed",
            project,
            procedure,
            meta: err,
        });

        throw err;
    }
    */

    // ===============================
    // Final Failure
    // ===============================
    throw {
        type: "NO_ENGINE_AVAILABLE",
        message: "No valid database engine available for execution",
    };
}