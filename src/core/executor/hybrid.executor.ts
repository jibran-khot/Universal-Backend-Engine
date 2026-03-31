/**
 * Hybrid executor decides which DB engine to use (SQL / Supabase),
 * executes the procedure, and handles caching + logging.
 *
 * SECURITY NOTE:
 * Guard is executed in run.ts.
 * Executor should only execute.
 */

import { EngineRequest } from "../contract/request";
import { EngineResponse } from "../contract/response";
import { resolveContext } from "../resolver";
import { runSqlProcedure } from "./sql.executor";
import { runSupabaseProcedure } from "./supabase.executor";
import { logger } from "../logger/logger";

// ===============================
// DB MODE CACHE (per project)
// ===============================

const DB_CACHE: Record<string, "sql" | "supabase"> = {};


/**
 * Executes a procedure using the hybrid database engine.
 */
export async function runProcedure(
    input: EngineRequest
): Promise<EngineResponse> {

    const start = Date.now();

    // Execution context from run.ts
    const execCtx = (input as any).__ctx;

    // Resolve DB context
    const ctx = resolveContext(input);
    const { project, dbName, procedure, payload } = ctx;

    const cachedMode = DB_CACHE[project];

    try {

        // 1️⃣ Use cached SQL mode
        if (cachedMode === "sql" && dbName) {

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
                requestId: execCtx?.requestId,
                action: "HYBRID_SQL_CACHED",
                message: "SQL execution via cached engine",
                durationMs: Date.now() - start,
                project,
                procedure,
                db: dbName,
            });

            return res;
        }

        /*
        // SUPABASE CACHED MODE (future enable)
        if (cachedMode === "supabase") {

            execCtx.engine = "supabase";

            const res = await runSupabaseProcedure(
                procedure,
                payload,
                project,
                input
            );

            logger.supabase({
                requestId: execCtx?.requestId,
                action: "HYBRID_SUPABASE_CACHED",
                message: "Supabase execution via cached engine",
                durationMs: Date.now() - start,
                project,
                procedure,
            });

            return res;
        }
        */

        // 2️⃣ Try SQL first
        if (dbName) {

            execCtx.engine = "sql";

            const res = await runSqlProcedure(
                dbName,
                procedure,
                payload,
                project,
                input.action,
                input
            );

            DB_CACHE[project] = "sql";

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
        }

    } catch (err: any) {

        logger.error({
            requestId: execCtx?.requestId,
            engine: "sql",
            action: "HYBRID_SQL_FAILURE",
            message: err?.message || "SQL execution failed",
            project,
            procedure,
            db: dbName,
            meta: err,
        });
    }

    // 3️⃣ Supabase fallback (disabled for now)
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
            requestId: execCtx?.requestId,
            action: "HYBRID_SUPABASE_SELECTED",
            message: "Supabase selected as execution engine",
            durationMs: Date.now() - start,
            project,
            procedure,
        });

        return res;

    } catch (err: any) {

        logger.error({
            requestId: execCtx?.requestId,
            engine: "supabase",
            action: "HYBRID_SUPABASE_FAILURE",
            message: err?.message || "Supabase execution failed",
            project,
            procedure,
            meta: err,
        });

        throw err;
    }
    */

    // Final failure
    throw {
        type: "SERVER_ERROR",
        message: "SQL execution failed and Supabase fallback is disabled."
    };
}
