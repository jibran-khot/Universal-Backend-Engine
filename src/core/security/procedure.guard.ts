/**
 * ============================================================
 * PROCEDURE VALIDATION GUARD (FINAL ENGINE VERSION)
 * ============================================================
 *
 * Purpose:
 * - Ensure procedure exists in platform registry
 * - Block unknown / unauthorized SQL calls
 * - Prevent SQL execution before resolver
 *
 * Source of truth:
 * platform/<project>/procedures.json
 *
 * Throws structured errors for global handler mapping.
 * ============================================================
 */

import { getProcedureDb } from "../resolver/procedure.registry";

/**
 * Validate procedure before execution
 */
export function guardProcedure(project: string, procedure: string) {

    // Missing procedure
    if (!procedure) {
        throw {
            type: "INVALID_REQUEST",
            message: "Procedure name missing in request"
        };
    }

    try {
        // Validate against registry
        getProcedureDb(project, procedure);
    } catch (err) {
        // Procedure not registered for this project
        throw {
            type: "PROCEDURE_NOT_ALLOWED",
            message: `Procedure '${procedure}' not registered in project '${project}'`
        };
    }

    return true;
}
