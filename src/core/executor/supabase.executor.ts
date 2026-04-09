/**
 * Supabase Executor
 * ----------------------------------------------------------------------------
 * जिम्मेदारी:
 * - Supabase RPC execute करना
 * - SQL executor जैसा same response contract maintain करना
 *
 * RULE:
 * - NEVER throw
 * - Always return EngineResponse
 */

import { createClient } from "@supabase/supabase-js";
import { ENV } from "../../config/env";
import {
    EngineResponse,
    ResponseMeta,
    DataSet
} from "../contract/response";
import { logger } from "../logger/logger";
import { EngineRequest } from "../contract/request";

// ===============================
// Types
// ===============================

type SafeObject = Record<string, unknown>;

interface SupabasePayload {
    ParamObj: SafeObject;
    DataObj: SafeObject;
}

// ===============================
// CLIENT
// ===============================

const supabase = createClient(
    ENV.db.supabase.url,
    ENV.db.supabase.serviceKey
);

// ===============================
// HELPERS
// ===============================

function buildSupabasePayload(payload: unknown): SupabasePayload {
    const p = (payload || {}) as {
        params?: SafeObject;
        data?: SafeObject;
    };

    return {
        ParamObj: p.params ?? {},
        DataObj: p.data ?? {},
    };
}

/**
 * Normalize to SQL-like dataset (tables)
 */
function normalizeToDataSet(data: unknown): DataSet {

    if (Array.isArray(data)) {
        return {
            tables: {
                table1: data
            }
        };
    }

    return {
        tables: {
            table1: [data]
        }
    };
}

/**
 * Normalize Supabase → EngineResponse
 */
function normalizeSupabaseResult(
    data: unknown,
    error: unknown,
    meta: ResponseMeta
): EngineResponse {

    // -------------------------------
    // Error case
    // -------------------------------
    if (error) {
        const err = error as { message?: string };

        const message =
            err?.message || "Supabase execution failed";

        return {
            status: {
                code: 500,
                success: false,
                message,
            },
            error: {
                code: "E_SUPABASE_EXECUTION",
                engine: "supabase",
                type: "SYSTEM",
                retryable: false,
                message,
                details: error,
            },
            meta,
            statusCode: 500,
            message,
        };
    }

    // -------------------------------
    // Already in engine format
    // -------------------------------
    if (
        typeof data === "object" &&
        data !== null &&
        "status" in data
    ) {
        const res = data as EngineResponse;

        return {
            status: res.status,
            data: res.data,
            meta,
            statusCode: res.status.code,
            message: res.status.message,
        };
    }

    // -------------------------------
    // Raw data case
    // -------------------------------
    const message = "Success";

    return {
        status: {
            code: 200,
            success: true,
            message,
        },
        data: normalizeToDataSet(data),
        meta,
        statusCode: 200,
        message,
    };
}

// ===============================
// MAIN EXECUTOR
// ===============================

export async function runSupabaseProcedure(
    procedure: string,
    payload: unknown,
    project: string,
    input?: EngineRequest
): Promise<EngineResponse> {

    const start = Date.now();

    const ctx = (input as {
        __ctx?: { requestId?: string };
    })?.__ctx;

    const meta: ResponseMeta = {
        requestId: ctx?.requestId,
        timestamp: start,
        db: "supabase",
        procedure,
    };

    logger.supabase({
        requestId: ctx?.requestId,
        action: "SUPABASE_EXECUTION_START",
        message: "Executing Supabase RPC",
        project,
        procedure,
    });

    try {

        if (!procedure) {
            return {
                status: {
                    code: 400,
                    success: false,
                    message: "Invalid procedure name",
                },
                error: {
                    code: "E_INVALID_PROCEDURE",
                    engine: "supabase",
                    type: "SYSTEM",
                    retryable: false,
                    message: "Procedure name is required",
                },
                meta,
            };
        }

        const { ParamObj, DataObj } = buildSupabasePayload(payload);

        const { data, error } = await supabase.rpc(procedure, {
            ParamObj,
            DataObj,
        });

        meta.durationMs = Date.now() - start;

        const response = normalizeSupabaseResult(data, error, meta);

        logger.supabase({
            requestId: ctx?.requestId,
            engine: "supabase",
            action: error
                ? "SUPABASE_EXECUTION_FAILED"
                : "SUPABASE_EXECUTION_SUCCESS",
            message: response.status.message,
            durationMs: meta.durationMs,
            project,
            procedure,
        });

        return response;

    } catch (err: unknown) {

        meta.durationMs = Date.now() - start;

        logger.error({
            requestId: ctx?.requestId,
            engine: "supabase",
            action: "SUPABASE_EXECUTION_ERROR",
            message: "Unexpected Supabase failure",
            project,
            procedure,
            meta: err,
        });

        return {
            status: {
                code: 500,
                success: false,
                message: "Supabase execution failed",
            },
            error: {
                code: "E_SUPABASE_EXECUTION_FATAL",
                engine: "supabase",
                type: "SYSTEM",
                retryable: false,
                message: "Unexpected Supabase failure",
                details: err,
            },
            meta,
            statusCode: 500,
            message: "Supabase execution failed",
        };
    }
}