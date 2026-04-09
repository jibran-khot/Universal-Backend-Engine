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

export type ProjectConfig = {
    project: string;
    masterDb?: string;
    clientDb?: string;
};

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

    if (!project) {
        throw new Error("CONFIG_ERROR: Project name missing");
    }

    if (!cache[project]) {
        const filePath = getProjectConfigPath(project);

        try {
            const raw = fs.readFileSync(filePath, "utf-8");
            const cfg = JSON.parse(raw) as ProjectConfig;

            cache[project] = {
                project: cfg.project || project,
                masterDb: cfg.masterDb,
                clientDb: cfg.clientDb,
            };
        } catch (err: any) {
            throw new Error(
                `CONFIG_PARSE_ERROR: Failed to load config for "${project}" → ${err.message}`
            );
        }
    }

    return cache[project];
}

// ===============================
// EXECUTION CONTEXT
// ===============================

export type ExecutionContext = {
    requestId: string;
    startTime: number;

    engine?: EngineType; // ✅ FIXED HERE

    project?: string;
    tenant?: string;

    auth?: AuthContext;
    token?: string;
};

// ===============================
// CREATE CONTEXT
// ===============================

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