/**
 * ============================================================
 * REQUEST VALIDATOR (ENGINE CONTRACT ENFORCEMENT)
 * ============================================================
 *
 * Purpose:
 * - Enforces strict request contract
 * - Rejects malformed or legacy requests
 * - Normalizes optional fields
 *
 * Accepted format:
 *
 * {
 *   action: {
 *     procedure: "ProcName",
 *     params: {},
 *     form: {}
 *   },
 *   auth: {},
 *   meta: {}
 * }
 *
 * Notes:
 * - Only NEW contract is supported
 * - Throws errors for invalid structure
 * - Returns normalized EngineRequest
 */

import { EngineRequest } from "../contract/request";

/**
 * Utility: strict object check (excludes null, arrays)
 */
function isPlainObject(value: any): boolean {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

/**
 * ============================================================
 * MAIN VALIDATION FUNCTION
 * ============================================================
 *
 * Steps:
 * 1. Validate root structure
 * 2. Validate action block
 * 3. Validate procedure
 * 4. Validate optional fields
 * 5. Normalize structure
 */
export function validateRequest(body: any): EngineRequest {
    /**
     * STEP 1: ROOT VALIDATION
     */
    if (!isPlainObject(body)) {
        throw new Error("INVALID_REQUEST: Invalid request body");
    }

    /**
     * STEP 2: ACTION VALIDATION
     */
    if (!isPlainObject(body.action)) {
        throw new Error("INVALID_REQUEST: action object is required");
    }

    /**
     * STEP 3: PROCEDURE VALIDATION
     */
    if (
        !body.action.procedure ||
        typeof body.action.procedure !== "string"
    ) {
        throw new Error("INVALID_REQUEST: action.procedure is required");
    }

    /**
     * STEP 4: PARAMS VALIDATION
     */
    if (
        body.action.params !== undefined &&
        !isPlainObject(body.action.params)
    ) {
        throw new Error("INVALID_REQUEST: action.params must be an object");
    }

    /**
     * STEP 5: FORM VALIDATION
     */
    if (
        body.action.form !== undefined &&
        !isPlainObject(body.action.form)
    ) {
        throw new Error("INVALID_REQUEST: action.form must be an object");
    }

    /**
     * STEP 6: AUTH VALIDATION
     */
    if (body.auth !== undefined && !isPlainObject(body.auth)) {
        throw new Error("INVALID_REQUEST: auth must be an object");
    }

    /**
     * STEP 7: META VALIDATION
     */
    if (body.meta !== undefined && !isPlainObject(body.meta)) {
        throw new Error("INVALID_REQUEST: meta must be an object");
    }

    /**
     * ============================================================
     * STEP 8: NORMALIZATION
     * ============================================================
     *
     * Ensures consistent structure across engine
     */
    const normalized: EngineRequest = {
        ...body,
        action: {
            procedure: body.action.procedure,
            params: body.action.params || {},
            form: body.action.form || {},
        },
        auth: body.auth || {},
        meta: body.meta || {},
    };

    return normalized;
}