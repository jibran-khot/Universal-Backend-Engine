/**
 * ============================================================
 * SQL EXECUTOR (CORE ENGINE)
 * ============================================================
 *
 * Responsibilities:
 * - Manage SQL connection pools (per database)
 * - Execute stored procedures
 * - Normalize SQL results → EngineResponse
 * - Map SQL errors → safe API response
 * - Provide structured logging
 *
 * Error Strategy:
 * - DO NOT throw errors
 * - Always return EngineResponse
 *
 * NOTE:
 * - Timeout is configured in SQL_CONFIG (db.ts)
 * - NOT on sqlRequest (mssql limitation)
 */

import sql from "mssql";
import { SQL_CONFIG } from "../../config/db";
import { EngineResponse, ResponseMeta, DataSet } from "../contract/response";
import { logger } from "../logger/logger";
import { SQL_ERROR_MAP } from "../errors/sql.error.codes";

/**
 * ============================================================
 * SQL POOL CACHE (per database)
 * ============================================================
 */
const sqlPools: Record<string, sql.ConnectionPool> = {};

/**
 * Get or create SQL connection pool
 * Handles broken connections safely
 */
async function getSqlPool(dbName: string) {
    const existing = sqlPools[dbName];

    // Reuse if connected
    if (existing && existing.connected) {
        return existing;
    }

    // Remove broken pool
    if (existing) {
        try {
            await existing.close();
        } catch { }
        delete sqlPools[dbName];
    }

    const pool = new sql.ConnectionPool({
        ...SQL_CONFIG,
        database: dbName,
    });

    const connectedPool = await pool.connect();
    sqlPools[dbName] = connectedPool;

    return connectedPool;
}

/**
 * ============================================================
 * BUILD SQL PAYLOAD
 * ============================================================
 */
function buildSqlPayload(payload: any, action: any) {
    return {
        ParamObj: payload?.params || action?.params || {},
        FormObj: payload?.data || action?.form || {},
    };
}

/**
 * ============================================================
 * DATASET NORMALIZATION
 * ============================================================
 */
function normalizeRecordsets(recordsets: any[]): DataSet {
    const tables: Record<string, unknown[]> = {};

    recordsets.forEach((set, index) => {
        tables[`table${index + 1}`] = set;
    });

    return { tables };
}

/**
 * ============================================================
 * SQL RESULT → ENGINE RESPONSE
 * ============================================================
 */
function normalizeSqlResult(result: any, meta: ResponseMeta): EngineResponse {
    const recordsets = Array.isArray(result?.recordsets)
        ? result.recordsets
        : Object.values(result?.recordsets || {});

    const firstRow = recordsets?.[0]?.[0] || {};

    return {
        status: {
            code: firstRow.StatusCode ?? 200,
            success: (firstRow.StatusCode ?? 200) < 400,
            message: firstRow.Message ?? "Success",
        },
        data: normalizeRecordsets(recordsets),
        meta,
        statusCode: firstRow.StatusCode ?? 200,
        message: firstRow.Message ?? "Success",
    };
}

/**
 * ============================================================
 * SQL ERROR MAPPING
 * ============================================================
 */
function mapSqlError(err: any, meta: ResponseMeta): EngineResponse {
    const sqlNumber: number | string | undefined =
        err?.number ??
        err?.originalError?.info?.number;

    const mapped =
        sqlNumber !== undefined
            ? SQL_ERROR_MAP[String(sqlNumber)]
            : undefined;

    const errorCode = mapped?.code || "E_SQL_EXECUTION_ERROR";

    const userMessage =
        mapped?.userMessage ||
        "Something went wrong while processing your request.";

    const retryable = mapped?.retryable ?? false;

    return {
        status: {
            code: 500,
            success: false,
            message: userMessage,
        },
        error: {
            code: errorCode,
            engine: "sql",
            retryable,
            type: mapped?.type || "SYSTEM",
            message: userMessage,
        },
        meta,
    };
}

/**
 * ============================================================
 * MAIN EXECUTOR FUNCTION
 * ============================================================
 */
export async function runSqlProcedure(
    dbName: string,
    procedure: string,
    payload: any,
    project: string,
    action?: any,
    request?: any
): Promise<EngineResponse> {

    const start = Date.now();
    const ctx = request?.__ctx;

    const meta: ResponseMeta = {
        timestamp: start,
        db: "sql",
        procedure,
        companyDb: dbName,
    };

    /**
     * SQL START LOG
     */
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

        const { ParamObj, FormObj } = buildSqlPayload(payload || {}, action || {});

        /**
         * Pass JSON payload to SQL
         */
        sqlRequest.input("ParamObj", sql.NVarChar(sql.MAX), JSON.stringify(ParamObj));
        sqlRequest.input("FormObj", sql.NVarChar(sql.MAX), JSON.stringify(FormObj));

        const result = await sqlRequest.execute(`dbo.${procedure}`);

        meta.durationMs = Date.now() - start;

        /**
         * SQL SUCCESS LOG
         */
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

    } catch (err: any) {

        meta.durationMs = Date.now() - start;

        /**
         * FULL ERROR LOG (INTERNAL ONLY)
         */
        logger.error({
            requestId: ctx?.requestId,
            engine: "sql",
            action: "SQL_EXECUTION_ERROR",
            message: err?.message || "SQL execution failure",
            project,
            procedure,
            db: dbName,
            meta: err,
        });

        return mapSqlError(err, meta);
    }
}