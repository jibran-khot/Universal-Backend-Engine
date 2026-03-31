/**
 * ============================================================
 * Procedure Registry Loader (FINAL ENGINE VERSION)
 * ============================================================
 *
 * Loads project-specific procedures.json and returns DB mapping.
 * Resolver depends on this as single source of truth.
 *
 * Throws structured engine errors for handler mapping.
 * ============================================================
 */

import fs from "fs";
import path from "path";

type ProcedureConfig = {
    db: "MASTER" | "TENANT";
};

type ProceduresFile = {
    procedures: Record<string, ProcedureConfig>;
};

let cachedRegistries: Record<string, ProceduresFile> = {};

/**
 * Load procedures.json for a project
 */
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

    const raw = fs.readFileSync(filePath, "utf-8");

    try {

        const parsed: ProceduresFile = JSON.parse(raw);

        if (!parsed.procedures) {
            throw {
                type: "SERVER_ERROR",
                message: "Invalid procedures.json structure"
            };
        }

        cachedRegistries[project] = parsed;
        return parsed;

    } catch (err) {

        throw {
            type: "SERVER_ERROR",
            message: `Invalid JSON in procedures.json for project: ${project}`
        };
    }
}

/**
 * Validate and get DB mapping for procedure
 */
export function getProcedureDb(
    project: string,
    procedureName: string
): "MASTER" | "TENANT" {

    const registry = loadProcedures(project);

    const proc = registry.procedures[procedureName];

    if (!proc) {
        throw {
            type: "PROCEDURE_NOT_ALLOWED",
            message: `Procedure '${procedureName}' not registered in project '${project}'`
        };
    }

    return proc.db;
}
