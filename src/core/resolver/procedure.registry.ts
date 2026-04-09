/**
 * ============================================================
 * Procedure Registry Loader
 * ============================================================
 *
 * Single source of truth for:
 * - Which procedure is allowed
 * - Which DB it belongs to
 */

import fs from "fs";
import path from "path";

// ===============================
// Types
// ===============================

type DbType = "MASTER" | "TENANT";

type ProcedureConfig = {
    db: DbType;
};

type ProceduresFile = {
    procedures: Record<string, ProcedureConfig>;
};

// ===============================
// Cache
// ===============================

const cachedRegistries: Record<string, ProceduresFile> = {};

// ===============================
// Helpers
// ===============================

function isDbType(value: unknown): value is DbType {
    return value === "MASTER" || value === "TENANT";
}

function validateProceduresFile(data: unknown, project: string): ProceduresFile {

    if (!data || typeof data !== "object") {
        throw {
            type: "SERVER_ERROR",
            message: `Invalid procedures.json format for project: ${project}`
        };
    }

    const parsed = data as ProceduresFile;

    if (!parsed.procedures || typeof parsed.procedures !== "object") {
        throw {
            type: "SERVER_ERROR",
            message: `Missing 'procedures' object in ${project}/procedures.json`
        };
    }

    // Validate each procedure entry
    for (const [name, config] of Object.entries(parsed.procedures)) {

        if (!config || typeof config !== "object") {
            throw {
                type: "SERVER_ERROR",
                message: `Invalid config for procedure '${name}' in project '${project}'`
            };
        }

        if (!isDbType(config.db)) {
            throw {
                type: "SERVER_ERROR",
                message: `Invalid DB type for procedure '${name}' in project '${project}'`
            };
        }
    }

    return parsed;
}

// ===============================
// Loader
// ===============================

function loadProcedures(project: string): ProceduresFile {

    if (cachedRegistries[project]) {
        return cachedRegistries[project];
    }

    const filePath = path.join(
        process.cwd(),
        "src",
        "platform",
        project,
        "procedures.json"
    );

    if (!fs.existsSync(filePath)) {
        throw {
            type: "SERVER_ERROR",
            message: `procedures.json not found for project: ${project}`
        };
    }

    let raw: string;

    try {
        raw = fs.readFileSync(filePath, "utf-8");
    } catch {
        throw {
            type: "SERVER_ERROR",
            message: `Failed to read procedures.json for project: ${project}`
        };
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        throw {
            type: "SERVER_ERROR",
            message: `Invalid JSON in procedures.json for project: ${project}`
        };
    }

    const validated = validateProceduresFile(parsed, project);

    cachedRegistries[project] = validated;

    return validated;
}

// ===============================
// Public API
// ===============================

export function getProcedureDb(
    project: string,
    procedureName: string
): DbType {

    const registry = loadProcedures(project);

    const proc = registry.procedures[procedureName];

    if (!proc) {
        throw {
            type: "PROCEDURE_NOT_ALLOWED",
            message: `Procedure '${procedureName}' is not registered in project '${project}'`
        };
    }

    return proc.db;
}