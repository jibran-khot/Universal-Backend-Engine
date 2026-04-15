/**
 * Central SQL Server error mapping table.
 * Maps SQL error numbers → engine-level standardized errors.
 */

type SqlErrorEntry = Readonly<{
    code: string;
    retryable: boolean;
    type: "SYSTEM" | "DATA" | "SECURITY";
    userMessage: string;
}>;

export const SQL_ERROR_MAP: Readonly<Record<string, SqlErrorEntry>> = Object.freeze({

    // divide by zero
    "8134": Object.freeze({
        code: "SQL_DIVIDE_BY_ZERO",
        retryable: false,
        type: "SYSTEM",
        userMessage: "Unexpected calculation error occurred.",
    }),

    // duplicate key
    "2627": Object.freeze({
        code: "SQL_DUPLICATE_KEY",
        retryable: false,
        type: "DATA",
        userMessage: "Record already exists.",
    }),

    // FK constraint
    "547": Object.freeze({
        code: "SQL_FOREIGN_KEY_CONSTRAINT",
        retryable: false,
        type: "DATA",
        userMessage: "Related record not found.",
    }),

    // procedure missing
    "2812": Object.freeze({
        code: "SQL_PROCEDURE_NOT_FOUND",
        retryable: false,
        type: "SYSTEM",
        userMessage: "Requested operation unavailable.",
    }),

    // timeout (negative SQL driver code)
    "-2": Object.freeze({
        code: "SQL_TIMEOUT",
        retryable: true,
        type: "SYSTEM",
        userMessage: "Request timed out. Try again.",
    }),

});