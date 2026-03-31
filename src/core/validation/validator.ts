/**
 * ============================= REQUEST VALIDATOR (FINAL ENGINE VERSION) =============================
 *
 * Accepts ONLY new request contract.
 *
 * Required format:
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
 * Old format rejected.
 * Throws structured INVALID_REQUEST errors.
 */

import { EngineRequest } from "../contract/request";

export function validateRequest(body: any): EngineRequest {

    if (!body || typeof body !== "object") {
        throw {
            type: "INVALID_REQUEST",
            message: "Invalid request body"
        };
    }

    // ACTION REQUIRED
    if (!body.action || typeof body.action !== "object") {
        throw {
            type: "INVALID_REQUEST",
            message: "Action object is required"
        };
    }

    // PROCEDURE REQUIRED
    if (!body.action.procedure || typeof body.action.procedure !== "string") {
        throw {
            type: "INVALID_REQUEST",
            message: "action.procedure is required"
        };
    }

    // PARAMS VALIDATION
    if (body.action.params && typeof body.action.params !== "object") {
        throw {
            type: "INVALID_REQUEST",
            message: "action.params must be an object"
        };
    }

    // FORM VALIDATION
    if (body.action.form && typeof body.action.form !== "object") {
        throw {
            type: "INVALID_REQUEST",
            message: "action.form must be an object"
        };
    }

    // AUTH VALIDATION
    if (body.auth && typeof body.auth !== "object") {
        throw {
            type: "INVALID_REQUEST",
            message: "auth must be an object"
        };
    }

    // META VALIDATION
    if (body.meta && typeof body.meta !== "object") {
        throw {
            type: "INVALID_REQUEST",
            message: "meta must be an object"
        };
    }

    return body as EngineRequest;
}
