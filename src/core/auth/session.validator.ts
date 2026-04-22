import { runSqlProcedure } from "../executor/sql.executor";
import { AuthIdentity } from "./auth.types";
import { logger } from "../logger/logger";

type SqlResponse = {
    status?: {
        success?: boolean;
    };
    data?: {
        tables?: Record<string, unknown[]>;
    };
};

// ===============================
// HELPERS
// ===============================

function extractValidTable(tables?: Record<string, unknown[]>): unknown[] {
    if (!tables || typeof tables !== "object") {
        throw new Error("AUTH_INVALID_TABLES");
    }

    for (const key of Object.keys(tables)) {
        const table = tables[key];
        if (Array.isArray(table) && table.length > 0) {
            return table;
        }
    }

    throw new Error("AUTH_NO_ROWS");
}

function extractIdentity(row: unknown, token: string): AuthIdentity {
    if (typeof row !== "object" || row === null) {
        throw new Error("AUTH_INVALID_ROW");
    }

    const record = row as Record<string, unknown>;

    const userId = record["AdminID"];
    const tenantId = record["Db"];

    if (!userId || !tenantId) {
        throw new Error("AUTH_INVALID_IDENTITY");
    }

    return {
        userId: String(userId),
        sessionId: token,
        tenantId: String(tenantId),
        roles:
            typeof record["Role"] === "string"
                ? [record["Role"]]
                : [],
        source: "sql",
    };
}

// ===============================
// VALIDATE SESSION
// ===============================

export async function validateSession(
    token: string,
    project: string
): Promise<AuthIdentity> {
    const startTime = Date.now();

    try {
        const response = (await runSqlProcedure({
            ctx: {
                requestId: "AUTH_SESSION",
                startTime,
            },
            procedure: "AdminAuthMeProc",
            project,
            dbName: "EcomSetup",
            payload: { params: { flag: "AuthMe", token } },
            action: {},
        })) as SqlResponse;

        // -------------------------------
        // STEP 1: BASIC SUCCESS CHECK
        // -------------------------------
        if (!response?.status?.success) {
            throw new Error("AUTH_FAILED");
        }

        // -------------------------------
        // STEP 2: TABLE EXTRACTION
        // -------------------------------
        const table = extractValidTable(response.data?.tables);

        // -------------------------------
        // STEP 3: IDENTITY BUILD
        // -------------------------------
        const identity = extractIdentity(table[0], token);

        logger.info({
            engine: "auth",
            action: "SESSION_VALIDATED",
            message: "Session validated successfully",
            meta: {
                userId: identity.userId,
                tenantId: identity.tenantId,
            },
            durationMs: Date.now() - startTime,
        });

        return identity;

    } catch (err: unknown) {
        logger.error({
            engine: "auth",
            action: "SESSION_VALIDATION_FAILED",
            message:
                err instanceof Error ? err.message : "AUTH_ERROR",
            meta: err,
            durationMs: Date.now() - startTime,
        });

        throw err;
    }
}