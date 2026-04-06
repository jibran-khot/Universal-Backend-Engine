/**
 * ============================================================
 * PROJECT CONTEXT + EXECUTION CONTEXT
 * ============================================================
 *
 * This file has TWO responsibilities:
 *
 * 1. Project Config Loader (Static, Cached)
 *    - Loads project-level DB configuration
 *    - Used by resolver/executor
 *
 * 2. Execution Context (Per Request)
 *    - Tracks request lifecycle
 *    - Used for logging, tracing, auth propagation
 *
 * ============================================================
 */

import fs from "fs";
import path from "path";
import { ENV } from "../config/env";
import { v4 as uuid } from "uuid";
import { AuthContext } from "./auth/auth.types";

/**
 * ============================================================
 * PROJECT CONFIG TYPE
 * ============================================================
 *
 * Represents per-project database configuration
 */
export type ProjectConfig = {
    project: string;
    masterDb?: string;
    clientDb?: string;
};

/**
 * ============================================================
 * CONFIG CACHE (IN-MEMORY)
 * ============================================================
 *
 * Avoids reading config file on every request
 */
const cache: Record<string, ProjectConfig> = {};

/**
 * ============================================================
 * RESOLVE PROJECT CONFIG FILE PATH
 * ============================================================
 *
 * Supports both:
 * - Development (src)
 * - Production build (dist)
 */
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

/**
 * ============================================================
 * LOAD PROJECT CONTEXT (CACHED)
 * ============================================================
 *
 * Used by:
 * - resolver
 * - executor
 *
 * Behavior:
 * - Reads config.json once
 * - Stores in memory cache
 */
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

/**
 * ============================================================
 * EXECUTION CONTEXT TYPE (RUNTIME)
 * ============================================================
 *
 * Created per request and passed through:
 * app → routes → run → executor → logger
 */
export type ExecutionContext = {
    requestId: string;
    startTime: number;

    engine?: "sql" | "supabase";
    project?: string;
    tenant?: string;

    /**
     * AUTH CONTEXT (Phase-3)
     */
    auth?: AuthContext;
    token?: string;
};

/**
 * ============================================================
 * CREATE EXECUTION CONTEXT
 * ============================================================
 *
 * Used ONLY as fallback if request context is missing.
 *
 * Primary source should always be:
 * app.ts middleware → req.context
 *
 * Why:
 * - Ensures single requestId across entire pipeline
 */
export function createExecutionContext(req?: any): ExecutionContext {
    return {
        requestId: uuid(),
        startTime: Date.now(),

        /**
         * Optional headers-based overrides
         * (useful for multi-tenant routing)
         */
        project: req?.headers?.["x-project"],
        tenant: req?.headers?.["x-tenant"],

        engine: undefined,
        auth: undefined,
        token: undefined,
    };
}