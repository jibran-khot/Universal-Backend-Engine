/**
 * Central SQL Server error mapping table.
 * Maps SQL error numbers → engine-level standardized errors.
 */

export const SQL_ERROR_MAP: Record<number | string, {
    code: string;
    retryable: boolean;
    type: "SYSTEM" | "DATA" | "SECURITY";
    userMessage: string;
}> = {

    // divide by zero
    8134: {
        code: "SQL_DIVIDE_BY_ZERO",
        retryable: false,
        type: "SYSTEM",
        userMessage: "Unexpected calculation error occurred.",
    },

    // duplicate key
    2627: {
        code: "SQL_DUPLICATE_KEY",
        retryable: false,
        type: "DATA",
        userMessage: "Record already exists.",
    },

    // FK constraint
    547: {
        code: "SQL_FOREIGN_KEY_CONSTRAINT",
        retryable: false,
        type: "DATA",
        userMessage: "Related record not found.",
    },

    // procedure missing
    2812: {
        code: "SQL_PROCEDURE_NOT_FOUND",
        retryable: false,
        type: "SYSTEM",
        userMessage: "Requested operation unavailable.",
    },

    // timeout (negative SQL driver code)
    "-2": {
        code: "SQL_TIMEOUT",
        retryable: true,
        type: "SYSTEM",
        userMessage: "Request timed out. Try again.",
    },

};
