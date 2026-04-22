/**
 * ============================================================
 * Procedure Registry Loader (PRODUCTION SAFE)
 * ============================================================
 */

import fs from "fs";
import path from "path";
import { logger } from "../logger/logger";

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

function assertString(value: unknown, code: string): string {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(code);
    }
    return value.trim();
}

// ===============================
// VALIDATION
// ===============================

function validateProceduresFile(
    data: unknown,
    project: string
): ProceduresFile {
    if (!isObject(data)) {
        throw new Error(`INVALID_PROCEDURES_FILE:${project}`);
    }

    const procedures = data["procedures"];

    if (!isObject(procedures)) {
        throw new Error(`INVALID_PROCEDURES_OBJECT:${project}`);
    }

    const validated: Record<string, ProcedureConfig> = {};

    for (const [name, config] of Object.entries(procedures)) {
        const procName = assertString(name, "INVALID_PROCEDURE_NAME");

        if (!isObject(config)) {
            throw new Error(`INVALID_PROCEDURE_CONFIG:${project}:${procName}`);
        }

        const db = config["db"];

        if (!isDbType(db)) {
            throw new Error(`INVALID_DB_TYPE:${project}:${procName}`);
        }

        validated[procName] = Object.freeze({ db });
    }

    return Object.freeze({
        procedures: validated,
    });
}

// ===============================
// LOADER (CACHED + SAFE)
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
        throw new Error(`PROCEDURE_FILE_NOT_FOUND:${project}`);
    }

    let parsed: unknown;

    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`PROCEDURE_FILE_INVALID_JSON:${project}`);
    }

    const validated = validateProceduresFile(parsed, project);

    cachedRegistries[project] = validated;

    logger.info({
        engine: "system",
        action: "PROCEDURE_REGISTRY_LOADED",
        message: "Procedure registry loaded",
        meta: { project },
    });

    return validated;
}

// ===============================
// PUBLIC API
// ===============================

export function getProcedureDb(
    project: string,
    procedureName: string
): DbType {
    const safeProject = assertString(project, "INVALID_PROJECT");
    const safeProcedure = assertString(procedureName, "INVALID_PROCEDURE");

    const registry = loadProcedures(safeProject);

    const proc = registry.procedures[safeProcedure];

    if (!proc) {
        throw new Error(
            `PROCEDURE_NOT_REGISTERED:${safeProject}:${safeProcedure}`
        );
    }

    return proc.db;
}