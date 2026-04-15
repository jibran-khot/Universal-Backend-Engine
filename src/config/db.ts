import { ENV } from "./env";

/**
 * ============================================================
 * SQL SERVER CONFIG (MSSQL DRIVER)
 * ============================================================
 */

function assertString(value: unknown, name: string): string {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`INVALID_DB_CONFIG: ${name}`);
    }
    return value;
}

function assertNumber(value: unknown, name: string): number {
    const num = Number(value);

    if (!Number.isFinite(num)) {
        throw new Error(`INVALID_DB_CONFIG: ${name}`);
    }

    return num;
}

export const SQL_CONFIG = Object.freeze({
    server: assertString(ENV.db.sqlserver.host, "DB_HOST"),
    port: assertNumber(ENV.db.sqlserver.port, "DB_PORT"),

    user: assertString(ENV.db.sqlserver.user, "DB_USER"),
    password: assertString(ENV.db.sqlserver.password, "DB_PASSWORD"),

    /**
     * Default DB (overridden dynamically per request)
     */
    database: assertString(ENV.db.sqlserver.name, "DB_NAME"),

    /**
     * ============================================================
     * CONNECTION OPTIONS
     * ============================================================
     */
    options: Object.freeze({
        encrypt: false,
        trustServerCertificate: true,
    }),

    /**
     * ============================================================
     * REQUEST TIMEOUT
     * ============================================================
     */
    requestTimeout: 30000,

    /**
     * ============================================================
     * CONNECTION TIMEOUT
     * ============================================================
     */
    connectionTimeout: 15000,

    /**
     * ============================================================
     * CONNECTION POOL CONFIG
     * ============================================================
     */
    pool: Object.freeze({
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    }),
});