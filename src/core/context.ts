/**
 * ============================================================
 * PROJECT CONTEXT + EXECUTION CONTEXT
 * ============================================================
 */

import fs from "fs";
import path from "path";
import { ENV } from "../config/env";
import { v4 as uuid } from "uuid";
import { AuthContext } from "./auth/auth.types";

/**
 * ============================================================
 * SHARED ENGINE TYPE (IMPORTANT)
 * ============================================================
 */

export type EngineType =
    | "sql"
    | "supabase"
    | "api"
    | "guard"
    | "auth"
    | "system";

/**
 * ============================================================
 * PROJECT CONFIG TYPE
 * ============================================================
 */

export type ProjectConfig = Readonly<{
    project: string;
    masterDb?: string;
    clientDb?: string;
}>;

// ===============================
// CACHE
// ===============================

const cache: Record<string, ProjectConfig> = {};

// ===============================
// PATH RESOLUTION
// ===============================

function getProjectConfigPath(project: string): string {
    const baseDir = process.cwd();

    const possiblePaths = [
        path.join(baseDir, "src", "projects", project, "config.json"),
        path.join(baseDir, "dist", "projects", project, "config.json"),
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }

    throw new Error(`CONFIG_NOT_FOUND: Project config missing for "${project}"`);
}

// ===============================
// LOAD CONFIG
// ===============================

export function getContext(projectName?: string): ProjectConfig {
    const project = projectName || ENV.project;

    if (!project || typeof project !== "string") {
        throw new Error("CONFIG_ERROR: Project name missing");
    }

    if (!cache[project]) {
        const filePath = getProjectConfigPath(project);

        try {
            const raw = fs.readFileSync(filePath, "utf-8");
            const cfg = JSON.parse(raw) as Partial<ProjectConfig>;

            cache[project] = Object.freeze({
                project: cfg.project || project,
                masterDb: cfg.masterDb,
                clientDb: cfg.clientDb,
            });
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "UNKNOWN_PARSE_ERROR";

            throw new Error(
                `CONFIG_PARSE_ERROR: Failed to load config for "${project}" → ${message}`
            );
        }
    }

    return cache[project];
}

// ===============================
// EXECUTION CONTEXT
// ===============================

export type ExecutionContext = Readonly<{
    requestId: string;
    startTime: number;

    engine?: EngineType;

    project?: string;
    tenant?: string;

    auth?: AuthContext;
    token?: string;
}>;

// ===============================
// CREATE CONTEXT (STRICT)
// ===============================

export function createExecutionContext(): ExecutionContext {
    return Object.freeze({
        requestId: uuid(),
        startTime: Date.now(),
        engine: undefined,
        project: undefined,
        tenant: undefined,
        auth: undefined,
        token: undefined,
    });
}