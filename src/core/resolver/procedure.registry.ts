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

type ProcedureConfig = Readonly<{
    db: DbType;
}>;

type ProceduresFile = Readonly<{
    procedures: Record<string, ProcedureConfig>;
}>;

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

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function validateProceduresFile(data: unknown, project: string): ProceduresFile {

    if (!isObject(data)) {
        throw new Error(`Invalid procedures.json format for project: ${project}`);
    }

    const procedures = data["procedures"];

    if (!isObject(procedures)) {
        throw new Error(`Missing 'procedures' object in ${project}/procedures.json`);
    }

    const validatedProcedures: Record<string, ProcedureConfig> = {};

    for (const [name, config] of Object.entries(procedures)) {

        if (!isObject(config)) {
            throw new Error(
                `Invalid config for procedure '${name}' in project '${project}'`
            );
        }

        const db = config["db"];

        if (!isDbType(db)) {
            throw new Error(
                `Invalid DB type for procedure '${name}' in project '${project}'`
            );
        }

        validatedProcedures[name] = Object.freeze({ db });
    }

    return Object.freeze({
        procedures: validatedProcedures,
    });
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
        throw new Error(`procedures.json not found for project: ${project}`);
    }

    let raw: string;

    try {
        raw = fs.readFileSync(filePath, "utf-8");
    } catch {
        throw new Error(`Failed to read procedures.json for project: ${project}`);
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`Invalid JSON in procedures.json for project: ${project}`);
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
        throw new Error(
            `Procedure '${procedureName}' is not registered in project '${project}'`
        );
    }

    return proc.db;
}