import fs from "fs";
import path from "path";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogPayload {
    level: LogLevel;
    timestamp: string;
    requestId?: string;
    engine?: "sql" | "supabase" | "api";
    action?: string;
    message: string;
    meta?: any;
    durationMs?: number;
    project?: string;
    procedure?: string;
    db?: string;
}

class Logger {
    private logDir = path.join(process.cwd(), "logs");

    constructor() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir);
        }
    }

    private write(file: string, payload: LogPayload) {
        const filePath = path.join(this.logDir, file);
        fs.appendFileSync(filePath, JSON.stringify(payload) + "\n");
    }

    private base(level: LogLevel, payload: Partial<LogPayload>): LogPayload {
        return {
            level,
            timestamp: new Date().toISOString(),
            message: payload.message || "",
            requestId: payload.requestId,
            engine: payload.engine,
            action: payload.action,
            meta: payload.meta,
            durationMs: payload.durationMs,
            project: payload.project,
            procedure: payload.procedure,
            db: payload.db,
        };
    }

    info(payload: Partial<LogPayload>) {
        this.write("app.log", this.base("INFO", payload));
    }

    warn(payload: Partial<LogPayload>) {
        this.write("app.log", this.base("WARN", payload));
    }

    debug(payload: Partial<LogPayload>) {
        this.write("debug.log", this.base("DEBUG", payload));
    }

    error(payload: Partial<LogPayload>) {
        this.write("error.log", this.base("ERROR", payload));
    }

    api(payload: Partial<LogPayload>) {
        this.write("api.log", this.base("INFO", { ...payload, engine: "api" }));
    }

    sql(payload: Partial<LogPayload>) {
        this.write("sql.log", this.base("INFO", { ...payload, engine: "sql" }));
    }

    supabase(payload: Partial<LogPayload>) {
        this.write("supabase.log", this.base("INFO", { ...payload, engine: "supabase" }));
    }
}

export const logger = new Logger();
