import { ENV } from "./env";

/**
 * ============================================================
 * SQL SERVER CONFIG (MSSQL DRIVER)
 * ============================================================
 *
 * Used by:
 * - sql.executor.ts
 *
 * Supports:
 * - connection pooling
 * - timeout control
 * - secure connection options
 */
export const SQL_CONFIG = {
    server: ENV.db.sqlserver.host,
    port: Number(ENV.db.sqlserver.port),

    user: ENV.db.sqlserver.user,
    password: ENV.db.sqlserver.password,

    /**
     * Default DB (overridden dynamically per request)
     */
    database: ENV.db.sqlserver.name,

    /**
     * ============================================================
     * CONNECTION OPTIONS
     * ============================================================
     */
    options: {
        encrypt: false, // set true if using Azure
        trustServerCertificate: true, // local/dev usage
    },

    /**
     * ============================================================
     * REQUEST TIMEOUT (IMPORTANT)
     * ============================================================
     *
     * Prevents long-running queries from hanging forever
     */
    requestTimeout: 30000, // 30 seconds

    /**
     * ============================================================
     * CONNECTION TIMEOUT
     * ============================================================
     *
     * Time to establish DB connection
     */
    connectionTimeout: 15000, // 15 seconds

    /**
     * ============================================================
     * CONNECTION POOL CONFIG
     * ============================================================
     *
     * Improves performance under concurrent load
     */
    pool: {
        max: 10,        // max active connections
        min: 0,         // minimum connections
        idleTimeoutMillis: 30000, // close idle connections
    },
};