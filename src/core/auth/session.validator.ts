import { runSqlProcedure } from "../executor/sql.executor";
import { AuthIdentity } from "./auth.types";

type SqlResponse = {
    status?: {
        success?: boolean;
    };
    data?: {
        tables?: Record<string, unknown[]>;
    };
};

export async function validateSession(
    token: string,
    project: string
): Promise<AuthIdentity> {

    const response = await runSqlProcedure({
        ctx: {
            requestId: "AUTH_SESSION",
            startTime: Date.now(),
        },
        procedure: "AdminAuthMeProc",
        project,
        dbName: "EcomSetup",
        payload: { params: { flag: "AuthMe", token } },
        action: {},
    });

    const res = response as SqlResponse;

    // -------------------------------
    // STEP 1: BASIC SUCCESS CHECK
    // -------------------------------
    if (!res?.status?.success) {
        throw new Error("AUTH_ERROR");
    }

    const tables = res.data?.tables;

    if (!tables || typeof tables !== "object") {
        throw new Error("AUTH_ERROR");
    }

    // -------------------------------
    // STEP 2: FIND FIRST VALID TABLE
    // -------------------------------
    let validTable: unknown[] | null = null;

    for (const key of Object.keys(tables)) {
        const table = tables[key];

        if (Array.isArray(table) && table.length > 0) {
            validTable = table;
            break;
        }
    }

    if (!validTable) {
        throw new Error("AUTH_ERROR");
    }

    // -------------------------------
    // STEP 3: EXTRACT USER
    // -------------------------------
    const user = validTable[0];

    if (typeof user !== "object" || user === null) {
        throw new Error("AUTH_ERROR");
    }

    const record = user as Record<string, unknown>;

    // -------------------------------
    // STEP 4: BUILD IDENTITY
    // -------------------------------
    const identity: AuthIdentity = {
        userId: String(record["AdminID"]),
        sessionId: token,
        tenantId: String(record["Db"]),
        roles:
            typeof record["Role"] === "string"
                ? [record["Role"]]
                : [],
        source: "sql",
    };

    return identity;
}