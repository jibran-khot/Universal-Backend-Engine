import { ENV } from "./env";

export const SQL_CONFIG = {
    server: ENV.db.sqlserver.host,
    port: Number(ENV.db.sqlserver.port),
    user: ENV.db.sqlserver.user,
    password: ENV.db.sqlserver.password,
    database: ENV.db.sqlserver.name,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};
