import { runSqlProcedure } from "../executor/sql.executor";
import { AuthIdentity } from "./auth.types";

export async function validateSession(
    token: string,
    project: string
): Promise<AuthIdentity> {

    const res = await runSqlProcedure(
        "EcomSetup",
        "AdminLoginProc",
        { params: { flag: "AuthMe", token } },
        project
    );

    if (!res?.status?.success) {
        throw {
            type: "AUTH_SESSION_INVALID",
            message: "Session not found or expired"
        };
    }

    const tables = (res as any)?.data?.tables;
    const user = tables?.table1?.[0];

    if (!user) {
        throw {
            type: "AUTH_SESSION_INVALID",
            message: "Session invalid"
        };
    }

    const identity: AuthIdentity = {
        userId: String(user.AdminID),
        sessionId: token,
        tenantId: user.Db,
        roles: user.Role ? [user.Role] : [],
        source: "sql"
    };

    return identity;
}
