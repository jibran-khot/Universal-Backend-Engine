/**
 * Supabase Executor
 * ----------------------------------------------------------------------------
 * जिम्मेदारी:
 * - Supabase RPC (Postgres function) execute करना
 * - Payload normalize करना
 * - EngineResponse contract maintain करना
 */

import { createClient } from "@supabase/supabase-js";
import { ENV } from "../../config/env";
import { EngineResponse } from "../contract/response";
import { logger } from "../logger/logger";
import { EngineRequest } from "../contract/request";

// ===============================
// Types
// ===============================

interface SupabasePayload {
    ParamObj: Record<string, unknown>;
    DataObj: Record<string, unknown>;
}

// ===============================
// CLIENT (singleton)
// ===============================

const supabase = createClient(
    ENV.db.supabase.url,
    ENV.db.supabase.serviceKey
);

// ===============================
// Helpers
// ===============================

function buildSupabasePayload(payload: unknown): SupabasePayload {
    const safePayload = (payload || {}) as {
        params?: Record<string, unknown>;
        data?: Record<string, unknown>;
    };

    return {
        ParamObj: safePayload.params ?? {},
        DataObj: safePayload.data ?? {},
    };
}

function normalizeSupabaseResult(
    data: unknown,
    error: unknown,
    meta: Record<string, unknown>
): EngineResponse {

    if (error) {
        const err = error as { message?: string };

        return {
            statusCode: 500,
            message: err?.message || "Supabase execution failed",
            data: [],
            meta,
        };
    }

    // Already in engine format
    if (
        typeof data === "object" &&
        data !== null &&
        "statusCode" in data
    ) {
        const res = data as EngineResponse;

        return {
            statusCode: res.statusCode,
            message: res.message ?? "Success",
            data: res.data ?? [],
            meta,
        };
    }

    // Normalize to dataset (2D array)
    const normalizedData = Array.isArray(data)
        ? data
        : [[data]];

    return {
        statusCode: 200,
        message: "Success",
        data: normalizedData,
        meta,
    };
}

// ===============================
// Main Executor
// ===============================

export async function runSupabaseProcedure(
    procedure: string,
    payload: unknown,
    project: string,
    input?: EngineRequest
): Promise<EngineResponse> {

    const start = Date.now();

    const execCtx = (input as unknown as {
        __ctx?: { requestId?: string };
    })?.__ctx;

    if (!procedure) {
        throw {
            type: "INVALID_PROCEDURE",
            message: "Supabase procedure name is required",
        };
    }

    const { ParamObj, DataObj } = buildSupabasePayload(payload);

    try {

        const { data, error } = await supabase.rpc(procedure, {
            ParamObj,
            DataObj,
        });

        const durationMs = Date.now() - start;

        const response = normalizeSupabaseResult(data, error, {
            project,
            db: "supabase",
            durationMs,
        });

        logger.supabase({
            requestId: execCtx?.requestId,
            engine: "supabase",
            action: "SUPABASE_EXECUTION",
            message: error ? "Execution failed" : "Execution successful",
            durationMs,
            project,
            procedure,
        });

        return response;

    } catch (err: unknown) {

        logger.error({
            requestId: execCtx?.requestId,
            engine: "supabase",
            action: "SUPABASE_EXECUTION_ERROR",
            message: "Unexpected Supabase execution failure",
            project,
            procedure,
            meta: err,
        });

        throw {
            type: "SUPABASE_EXECUTION_FAILED",
            message: "Supabase execution failed",
            meta: err,
        };
    }
}