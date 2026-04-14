import sql from "mssql";
import { SQL_CONFIG } from "../../config/db";
import { EngineResponse } from "../contract/response";
import { logger } from "../logger/logger";
import { SQL_ERROR_MAP } from "../errors/sql.error.codes";

type ExecutionInput = Readonly<{
    ctx: Readonly<{
        requestId: string;
        startTime: number;
    }>;
    procedure: string;
    project: string;
    dbName: string;
    payload: unknown;
    action: unknown;
}>;

type SafeObject = Readonly<Record<string, unknown>>;

const sqlPools: Record<string, sql.ConnectionPool> = {};

// ===============================
// POOL
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
// VALIDATION
// ===============================

function assertProcedureName(procedure: string): string {
    if (!/^[a-zA-Z0-9_]+$/.test(procedure)) {
        throw new Error("INVALID_PROCEDURE_NAME");
    }
    return procedure;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertObject(value: unknown, code: string): Record<string, unknown> {
    if (!isObject(value)) {
        throw new Error(code);
    }
    return value;
}

// ===============================
// PAYLOAD BUILDER (STRICT)
// ===============================

function toSafeObject(value: unknown, code: string): SafeObject {
    const obj = assertObject(value, code);

    const result: Record<string, unknown> = {};

    for (const key of Object.keys(obj)) {
        result[key] = obj[key];
    }

    return Object.freeze(result);
}

function buildSqlPayload(
    payload: unknown,
    action: unknown
): { ParamObj: SafeObject; FormObj: SafeObject } {

    const p = payload !== undefined ? assertObject(payload, "INVALID_PAYLOAD") : {};
    const a = assertObject(action, "INVALID_ACTION");

    const ParamObj =
        p["params"] !== undefined
            ? toSafeObject(p["params"], "INVALID_PARAMS")
            : toSafeObject(a["params"], "INVALID_PARAMS");

    const FormObj =
        p["data"] !== undefined
            ? toSafeObject(p["data"], "INVALID_FORM")
            : toSafeObject(a["form"], "INVALID_FORM");

    return Object.freeze({
        ParamObj,
        FormObj,
    });
}

// ===============================
// HELPERS
// ===============================

function normalizeRecordsets(recordsets: unknown[]): Record<string, unknown[]> {
    const tables: Record<string, unknown[]> = {};

    recordsets.forEach((set, index) => {
        tables[`table${index + 1}`] = Array.isArray(set) ? set : [];
    });

    return tables;
}

function mapSqlError(err: unknown): { code: string; message: string } {
    const e = err as {
        number?: number;
        originalError?: { info?: { number?: number } };
    };

    const sqlNumber =
        e?.number ?? e?.originalError?.info?.number;

    const mapped =
        sqlNumber !== undefined
            ? SQL_ERROR_MAP[String(sqlNumber)]
            : undefined;

    return {
        code: mapped?.code || "SQL_EXECUTION_FAILED",
        message:
            mapped?.userMessage ||
            "Database execution failed",
    };
}

// ===============================
// EXECUTION
// ===============================

export async function runSqlProcedure(
    input: ExecutionInput
): Promise<EngineResponse> {

    const start = Date.now();

    const {
        ctx,
        procedure,
        project,
        dbName,
        payload,
        action,
    } = input;

    const safeProcedure = assertProcedureName(procedure);

    logger.sql({
        requestId: ctx.requestId,
        action: "SQL_EXECUTION_START",
        message: "Executing stored procedure",
        project,
        procedure: safeProcedure,
        db: dbName,
    });

    try {
        const pool = await getSqlPool(dbName);
        const request = pool.request();

        const { ParamObj, FormObj } = buildSqlPayload(payload, action);

        request.input("ParamObj", sql.NVarChar(sql.MAX), JSON.stringify(ParamObj));
        request.input("FormObj", sql.NVarChar(sql.MAX), JSON.stringify(FormObj));

        const result = await request.execute(`dbo.${safeProcedure}`);

        const recordsets = Array.isArray(result.recordsets)
            ? result.recordsets
            : [];

        const firstRow =
            Array.isArray(recordsets[0]) && recordsets[0][0] && typeof recordsets[0][0] === "object"
                ? recordsets[0][0] as Record<string, unknown>
                : {};

        const statusCode =
            typeof firstRow["StatusCode"] === "number"
                ? firstRow["StatusCode"]
                : 200;

        const message =
            typeof firstRow["Message"] === "string"
                ? firstRow["Message"]
                : "Success";

        const response: EngineResponse = Object.freeze({
            status: Object.freeze({
                code: statusCode,
                success: statusCode < 400,
                message,
            }),
            data: {
                tables: normalizeRecordsets(recordsets),
            },
            meta: Object.freeze({
                requestId: ctx.requestId,
                durationMs: Date.now() - start,
                db: "sql",
                procedure: safeProcedure,
                project,
            }),
            statusCode,
            message,
        });

        logger.sql({
            requestId: ctx.requestId,
            action: "SQL_EXECUTION_SUCCESS",
            message: "Stored procedure executed",
            durationMs: Date.now() - start,
            project,
            procedure: safeProcedure,
            db: dbName,
        });

        return response;

    } catch (err: unknown) {

        const mapped = mapSqlError(err);

        logger.error({
            requestId: ctx.requestId,
            engine: "sql",
            action: "SQL_EXECUTION_ERROR",
            message: mapped.message,
            meta: err,
            project,
            procedure: safeProcedure,
        });

        return Object.freeze({
            status: Object.freeze({
                code: 500,
                success: false,
                message: mapped.message,
            }),
            error: Object.freeze({
                code: mapped.code,
                message: mapped.message,
                type: "SYSTEM",
                retryable: false,
            }),
            statusCode: 500,
            message: mapped.message,
        });
    }
}