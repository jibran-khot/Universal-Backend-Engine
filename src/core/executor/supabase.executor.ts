/**
 * This file executes Supabase RPC functions (Postgres procedures).
 * It sends payload to Supabase, handles errors, and normalizes results
 * into the engine response format.
 */

import { createClient } from "@supabase/supabase-js";
import { ENV } from "../../config/env";
import { EngineResponse } from "../contract/response";

// ===============================
// SUPABASE CLIENT (singleton)
// ===============================

const supabase = createClient(
    ENV.db.supabase.url,
    ENV.db.supabase.serviceKey
);

/**
 * Builds payload structure sent to Supabase RPC.
 */
function buildSupabasePayload(payload: any) {
    return {
        ParamObj: payload?.params || {},
        DataObj: payload?.data || {},
    };
}

/**
 * Normalizes Supabase result into engine response format.
 */
function normalizeSupabaseResult(
    data: any,
    error: any,
    meta: any
): EngineResponse {
    if (error) {
        return {
            statusCode: 500,
            message: error.message,
            data: [],
            meta,
        };
    }

    // If Supabase function already returns engine-style response
    if (data?.statusCode !== undefined) {
        return {
            statusCode: data.statusCode,
            message: data.message ?? "Success",
            data: data.data ?? [],
            meta,
        };
    }

    // Wrap raw data into engine dataset
    return {
        statusCode: 200,
        message: "Success",
        data: Array.isArray(data) ? [data] : [[data]],
        meta,
    };
}

/**
 * Executes a Supabase RPC function.
 */
export async function runSupabaseProcedure(
    procedure: string,
    payload: any,
    project: string
): Promise<EngineResponse> {
    const { ParamObj, DataObj } = buildSupabasePayload(payload);

    const start = Date.now();

    const { data, error } = await supabase.rpc(procedure, {
        ParamObj,
        DataObj,
    });

    const durationMs = Date.now() - start;

    return normalizeSupabaseResult(data, error, {
        project,
        db: "supabase",
        durationMs,
    });
}
