/**
 * ============================================================
 * PROCEDURE VALIDATION GUARD
 * ============================================================
 *
 * Purpose:
 * - Ensure procedure exists in platform registry
 * - Block unknown / unauthorized procedure execution
 * - Prevent invalid SQL calls before resolver
 *
 * Source of truth:
 * platform/<project>/procedures.json
 *
 * Flow:
 * run.ts → guard → resolver → executor
 *
 * Notes:
 * - This is a SECURITY layer
 * - Must be fast and fail early
 */

import { getProcedureDb } from "../resolver/procedure.registry";
import { logger } from "../logger/logger";

/**
 * ============================================================
 * VALIDATE PROCEDURE ACCESS
 * ============================================================
 *
 * @param project   → project name (multi-tenant support)
 * @param procedure → procedure name requested by client
 *
 * Throws:
 * - INVALID_REQUEST
 * - PROCEDURE_NOT_ALLOWED
 */
export function guardProcedure(project: string, procedure: string) {
    /**
     * STEP 1: BASIC VALIDATION
     */
    if (!project || typeof project !== "string") {
        throw new Error("INVALID_REQUEST: Project name missing");
    }

    if (!procedure || typeof procedure !== "string") {
        throw new Error("INVALID_REQUEST: Procedure name missing");
    }

    try {
        /**
         * STEP 2: REGISTRY VALIDATION
         *
         * Checks if procedure exists in:
         * platform/<project>/procedures.json
         */
        getProcedureDb(project, procedure);
    } catch (err: any) {
        /**
         * STEP 3: LOG BLOCKED ACCESS (IMPORTANT)
         *
         * Helps track:
         * - invalid calls
         * - potential abuse attempts
         */
        logger.error({
            engine: "guard",
            action: "PROCEDURE_BLOCKED",
            message: "Unauthorized procedure access attempt",
            meta: {
                project,
                procedure,
            },
        });

        /**
         * STEP 4: THROW STANDARDIZED ERROR
         */
        throw new Error(
            `PROCEDURE_NOT_ALLOWED: Procedure '${procedure}' not registered in project '${project}'`
        );
    }

    /**
     * STEP 5: SUCCESS (NO RETURN NEEDED, BUT KEPT FOR CLARITY)
     */
    return true;
}