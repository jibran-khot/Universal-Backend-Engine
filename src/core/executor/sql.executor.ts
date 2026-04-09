/**
 * ============================================================
 * SQL EXECUTOR (CORE ENGINE)
 * ============================================================
 *
 * Responsibilities:
 * - Manage SQL connection pools
 * - Execute stored procedures
 * - Normalize SQL results → EngineResponse
 * - Map SQL errors → EngineResponse
 *
 * RULE:
 * - NEVER throw → always return EngineResponse
 */

import sql from "mssql";
import { SQL_CONFIG } from "../../config/db";
import {
    EngineResponse,
    ResponseMeta,
    DataSet
} from "../contract/response";
import { logger } from "../logger/logger";
import { SQL_ERROR_MAP } from "../errors/sql.error.codes";

// ===============================
// Types
// ===============================

type SafeObject = Record<string, unknown>;

// ===============================
// POOL CACHE
// ===============================

const sqlPools: Record<string, sql.ConnectionPool> = {};

// ===============================
// POOL MANAGER
// ===============================

async function getSqlPool(dbName: string): Promise<sql.ConnectionPool> {
    const existing = sqlPools[dbName];

    if (existing?.connected) return existing;

    if (existing) {
        try { await existing.close(); } catch { }
        delete sqlPools[dbName];
    }

    const pool = new sql.ConnectionPool({
        ...SQL_CONFIG,
        database: dbName,
    });

    const connected = await pool.connect();
    sqlPools[dbName] = connected;

    return connected;
}

// ===============================
// PAYLOAD BUILDER
// ===============================

function buildSqlPayload(
    payload: unknown,
    action: unknown
): { ParamObj: SafeObject; FormObj: SafeObject } {

    const p = (payload || {}) as {
        params?: SafeObject;
        data?: SafeObject;
    };

    const a = (action || {}) as {
        params?: SafeObject;
        form?: SafeObject;
    };

    return {
        ParamObj: p.params ?? a.params ?? {},
        FormObj: p.data ?? a.form ?? {},
    };
}

// ===============================
// DATASET NORMALIZATION
// ===============================

function normalizeRecordsets(recordsets: unknown[]): DataSet {

    const tables: Record<string, unknown[]> = {};

    recordsets.forEach((set, index) => {
        tables[`table${index + 1}`] = Array.isArray(set) ? set : [];
    });

    return { tables };
}

// ===============================
// RESULT NORMALIZATION
// ===============================

function normalizeSqlResult(
    result: unknown,
    meta: ResponseMeta
): EngineResponse {

    const safeResult = result as {
        recordsets?: unknown[];
    };

    const recordsets = Array.isArray(safeResult?.recordsets)
        ? safeResult.recordsets
        : [];

    const firstRow =
        (recordsets?.[0] as unknown[])?.[0] as Record<string, unknown> || {};

    const statusCode =
        typeof firstRow?.StatusCode === "number"
            ? firstRow.StatusCode
            : 200;

    const message =
        typeof firstRow?.Message === "string"
            ? firstRow.Message
            : "Success";

    return {
        status: {
            code: statusCode,
            success: statusCode < 400,
            message,
        },
        data: normalizeRecordsets(recordsets),
        meta,
        statusCode,
        message,
    };
}

// ===============================
// ERROR MAPPING
// ===============================

function mapSqlError(
    err: unknown,
    meta: ResponseMeta
): EngineResponse {

    const e = err as {
        number?: number;
        originalError?: { info?: { number?: number } };
        message?: string;
    };

    const sqlNumber =
        e?.number ??
        e?.originalError?.info?.number;

    const mapped =
        sqlNumber !== undefined
            ? SQL_ERROR_MAP[String(sqlNumber)]
            : undefined;

    const errorCode = mapped?.code || "E_SQL_EXECUTION_ERROR";
    const userMessage =
        mapped?.userMessage ||
        "Something went wrong while processing your request.";

    return {
        status: {
            code: 500,
            success: false,
            message: userMessage,
        },
        error: {
            code: errorCode,
            engine: "sql",
            retryable: mapped?.retryable ?? false,
            type: mapped?.type || "SYSTEM",
            message: userMessage,
            details: err, // internal only
        },
        meta,
    };
}

// ===============================
// MAIN EXECUTOR
// ===============================

export async function runSqlProcedure(
    dbName: string,
    procedure: string,
    payload: unknown,
    project: string,
    action?: unknown,
    request?: unknown
): Promise<EngineResponse> {

    const start = Date.now();

    const ctx = (request as {
        __ctx?: { requestId?: string };
    })?.__ctx;

    const meta: ResponseMeta = {
        requestId: ctx?.requestId,
        timestamp: start,
        db: "sql",
        procedure,
        companyDb: dbName,
    };

    logger.sql({
        requestId: ctx?.requestId,
        action: "SQL_EXECUTION_START",
        message: "Executing stored procedure",
        project,
        procedure,
        db: dbName,
    });

    try {

        const pool = await getSqlPool(dbName);
        const sqlRequest = pool.request();

        const { ParamObj, FormObj } = buildSqlPayload(payload, action);

        sqlRequest.input("ParamObj", sql.NVarChar(sql.MAX), JSON.stringify(ParamObj));
        sqlRequest.input("FormObj", sql.NVarChar(sql.MAX), JSON.stringify(FormObj));

        const result = await sqlRequest.execute(`dbo.${procedure}`);

        meta.durationMs = Date.now() - start;

        logger.sql({
            requestId: ctx?.requestId,
            action: "SQL_EXECUTION_SUCCESS",
            message: "Stored procedure executed successfully",
            durationMs: meta.durationMs,
            project,
            procedure,
            db: dbName,
        });

        return normalizeSqlResult(result, meta);

    } catch (err: unknown) {

        meta.durationMs = Date.now() - start;

        logger.error({
            requestId: ctx?.requestId,
            engine: "sql",
            action: "SQL_EXECUTION_ERROR",
            message: "SQL execution failure",
            project,
            procedure,
            db: dbName,
            meta: err,
        });

        return mapSqlError(err, meta);
    }
}