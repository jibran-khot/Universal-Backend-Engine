/**
 * ============================= PROJECT CONTEXT LOADER =============================
 *
 * Ye file backend engine ka configuration brain hai.
 * Resolver aur executor yahin se DB context lete hain.
 *
 * =============================================================================
 */

import fs from "fs";
import path from "path";
import { ENV } from "../config/env";
import { v4 as uuid } from "uuid";
import { AuthContext } from "./auth/auth.types";

export type ProjectConfig = {
    project: string;
    masterDb?: string;
    clientDb?: string;
};


// ===============================
// CONFIG CACHE
// ===============================

const cache: Record<string, ProjectConfig> = {};


// ===============================
// CONFIG FILE PATH RESOLUTION
// ===============================

function getProjectConfigPath(project: string) {

    const baseDir = process.cwd();

    const possiblePaths = [
        path.join(baseDir, "src", "projects", project, "config.json"),
        path.join(baseDir, "dist", "projects", project, "config.json"),
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }

    throw new Error(`Project config not found for project: ${project}`);
}


// ===============================
// MAIN CONTEXT FUNCTION
// ===============================

export function getContext(projectName?: string): ProjectConfig {

    const project = projectName || ENV.project;

    if (!project) {
        throw new Error("Project name missing in ENV and request");
    }

    if (!cache[project]) {

        const filePath = getProjectConfigPath(project);

        const raw = fs.readFileSync(filePath, "utf-8");
        const cfg = JSON.parse(raw) as ProjectConfig;

        cache[project] = {
            project: cfg.project || project,
            masterDb: cfg.masterDb,
            clientDb: cfg.clientDb,
        };
    }

    return cache[project];
}


// ===============================
// EXECUTION CONTEXT (PHASE-3)
// ===============================

/**
 * Runtime execution context.
 * Travels across:
 * resolver → executor → DB → response
 */
export type ExecutionContext = {
    requestId: string;
    startTime: number;
    engine?: "sql" | "supabase";
    project?: string;
    tenant?: string;

    /**
     * AUTH INTEGRATION (Phase-3 Step-3)
     */
    auth?: AuthContext;
    token?: string;
};


/**
 * Creates per-request execution context.
 */
export function createExecutionContext(req?: any): ExecutionContext {
    return {
        requestId: uuid(),
        startTime: Date.now(),
        project: req?.headers?.["x-project"],
        tenant: req?.headers?.["x-tenant"],
        engine: undefined,
        auth: undefined,
        token: undefined,
    };
}
