import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// ===============================
// LOAD BASE ENV
// ===============================

dotenv.config();

// ===============================
// TYPES
// ===============================

type DbType = "sqlserver" | "supabase";
type ProjectType = "ecom" | "school";

// ===============================
// HELPERS (STRICT VALIDATION)
// ===============================

function assertString(value: unknown, name: string): string {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`ENV_ERROR: ${name} is required`);
    }
    return value.trim();
}

function assertNumber(value: unknown, name: string): number {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        throw new Error(`ENV_ERROR: ${name} must be a valid number`);
    }
    return num;
}

function assertEnum<T extends string>(
    value: unknown,
    allowed: readonly T[],
    name: string
): T {
    if (typeof value !== "string" || !allowed.includes(value as T)) {
        throw new Error(
            `ENV_ERROR: ${name} must be one of [${allowed.join(", ")}]`
        );
    }
    return value as T;
}

// ===============================
// PROJECT RESOLUTION (SAFE DEFAULT)
// ===============================

const rawProject = process.env.PROJECT || "ecom";

const activeProject = assertEnum<ProjectType>(
    rawProject,
    ["ecom", "school"],
    "PROJECT"
);

// ===============================
// LOAD PROJECT ENV (OPTIONAL SAFE)
// ===============================

const projectEnvPath = path.join(process.cwd(), `.env.${activeProject}`);

if (fs.existsSync(projectEnvPath)) {
    dotenv.config({ path: projectEnvPath });
}

// ===============================
// OPTIONAL HELPERS
// ===============================

function optionalNumber(value: unknown, fallback: number): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function optionalString(value: unknown, fallback: string): string {
    if (typeof value === "string" && value.trim() !== "") {
        return value.trim();
    }
    return fallback;
}

// ===============================
// EXPORT ENV (STRICT + SAFE DEFAULTS)
// ===============================

export const ENV = Object.freeze({
    server: Object.freeze({
        env: process.env.NODE_ENV || "development",
        port: optionalNumber(process.env.PORT, 3000),
    }),

    project: activeProject,

    db: Object.freeze({
        primary: assertEnum<DbType>(
            process.env.DB_PRIMARY,
            ["sqlserver", "supabase"],
            "DB_PRIMARY"
        ),

        sqlserver: Object.freeze({
            host: assertString(process.env.DB_HOST, "DB_HOST"),
            port: optionalNumber(process.env.DB_PORT, 1433),
            instance: optionalString(process.env.DB_INSTANCE, ""),
            name: assertString(process.env.DB_NAME, "DB_NAME"),
            user: assertString(process.env.DB_USER, "DB_USER"),
            password: assertString(process.env.DB_PASSWORD, "DB_PASSWORD"),
        }),

        supabase: Object.freeze({
            url: assertString(process.env.SUPABASE_URL, "SUPABASE_URL"),
            serviceKey: assertString(
                process.env.SUPABASE_SERVICE_ROLE_KEY,
                "SUPABASE_SERVICE_ROLE_KEY"
            ),
        }),
    }),

    engineDb: Object.freeze({
        master: assertString(process.env.DB_MASTER_NAME, "DB_MASTER_NAME"),
        tenantDefault: assertString(
            process.env.DB_TENANT_DEFAULT,
            "DB_TENANT_DEFAULT"
        ),
    }),

    security: Object.freeze({
        jwtSecret: assertString(process.env.JWT_SECRET, "JWT_SECRET"),
        jwtExpiresIn: optionalString(process.env.JWT_EXPIRES_IN, "1d"),
    }),
});