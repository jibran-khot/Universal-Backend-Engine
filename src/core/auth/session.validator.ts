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
        procedure: "AdminLoginProc",
        project,
        dbName: "EcomSetup",
        payload: { params: { flag: "AuthMe", token } },
        action: {},
    });

    const res = response as SqlResponse;

    if (!res?.status?.success) {
        throw new Error("AUTH_ERROR");
    }

    const tables = res.data?.tables;

    if (!tables || typeof tables !== "object") {
        throw new Error("AUTH_ERROR");
    }

    const table1 = tables["table1"];

    if (!Array.isArray(table1) || table1.length === 0) {
        throw new Error("AUTH_ERROR");
    }

    const user = table1[0];

    if (typeof user !== "object" || user === null) {
        throw new Error("AUTH_ERROR");
    }

    const record = user as Record<string, unknown>;

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