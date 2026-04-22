import { ENV } from "./env";

/**
 * ============================================================
 * SQL SERVER CONFIG (PRODUCTION SAFE)
 * ============================================================
 */

// ===============================
// VALIDATION HELPERS
// ===============================

function assertString(value: unknown, name: string): string {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`INVALID_DB_CONFIG:${name}`);
    }
    return value.trim();
}

function assertNumber(value: unknown, name: string): number {
    const num = Number(value);

    if (!Number.isFinite(num)) {
        throw new Error(`INVALID_DB_CONFIG:${name}`);
    }

    return num;
}

// ===============================
// BASE CONFIG
// ===============================

const baseConfig = {
    server: assertString(ENV.db.sqlserver.host, "DB_HOST"),
    port: assertNumber(ENV.db.sqlserver.port, "DB_PORT"),

    user: assertString(ENV.db.sqlserver.user, "DB_USER"),
    password: assertString(ENV.db.sqlserver.password, "DB_PASSWORD"),

    database: assertString(ENV.db.sqlserver.name, "DB_NAME"),

    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
    },

    requestTimeout: 30000,
    connectionTimeout: 15000,

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

// ===============================
// INSTANCE SUPPORT (OPTIONAL)
// ===============================

const instance = ENV.db.sqlserver.instance;

export const SQL_CONFIG = Object.freeze({
    ...baseConfig,
    ...(instance
        ? {
            options: {
                ...baseConfig.options,
                instanceName: instance,
            },
        }
        : {}),
});