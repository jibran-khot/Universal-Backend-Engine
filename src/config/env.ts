import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// ===============================
// LOAD ENV
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
    return value;
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
        throw new Error(`ENV_ERROR: ${name} must be one of [${allowed.join(", ")}]`);
    }
    return value as T;
}

// ===============================
// PROJECT RESOLUTION
// ===============================

const activeProject = assertEnum<ProjectType>(
    process.env.PROJECT,
    ["ecom", "school"],
    "PROJECT"
);

// ===============================
// LOAD PROJECT ENV
// ===============================

const projectEnvPath = path.join(process.cwd(), `.env.${activeProject}`);

if (fs.existsSync(projectEnvPath)) {
    dotenv.config({ path: projectEnvPath });
} else {
    throw new Error(`ENV_ERROR: Project env not found: ${projectEnvPath}`);
}

// ===============================
// EXPORT ENV (STRICT)
// ===============================

export const ENV = Object.freeze({
    server: Object.freeze({
        env: process.env.NODE_ENV || "development",
        port: assertNumber(process.env.PORT, "PORT"),
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
            port: assertNumber(process.env.DB_PORT, "DB_PORT"),
            instance: process.env.DB_INSTANCE || "",
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
});