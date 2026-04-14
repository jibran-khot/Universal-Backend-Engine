import { getProcedureDb } from "../resolver/procedure.registry";
import { logger } from "../logger/logger";

type GuardInput = Readonly<{
    project: string;
    procedure: string;
    requestId: string;
}>;

// ===============================
// VALIDATION
// ===============================

function assertValidString(value: unknown, code: string): string {
    if (typeof value !== "string") {
        throw new Error(code);
    }

    const normalized = value.trim();

    if (normalized.length === 0) {
        throw new Error(code);
    }

    return normalized;
}

// ===============================
// GUARD
// ===============================

export function guardProcedure(input: GuardInput): void {
    const project = assertValidString(input.project, "INVALID_PROJECT");
    const procedure = assertValidString(input.procedure, "INVALID_PROCEDURE");

    const record = getProcedureDb(project, procedure);

    // -------------------------------
    // AUTHORIZATION CHECK
    // -------------------------------
    if (!record) {
        logger.error({
            requestId: input.requestId,
            engine: "guard",
            action: "PROCEDURE_BLOCKED",
            message: "Unauthorized procedure access",
            meta: {
                project,
                procedure,
            },
        });

        throw new Error("PROCEDURE_NOT_ALLOWED");
    }
}