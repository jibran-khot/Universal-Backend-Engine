import fs from "fs";
import path from "path";

// ===============================
// Types
// ===============================

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

type EngineType =
    | "sql"
    | "supabase"
    | "api"
    | "guard"
    | "auth"
    | "system";

interface LogPayload {
    level: LogLevel;
    timestamp: string;
    message: string;
    requestId?: string;
    engine?: EngineType;
    action?: string;
    meta?: unknown;
    durationMs?: number;
    project?: string;
    procedure?: string;
    db?: string;
}

// ===============================
// Logger Class
// ===============================

class Logger {

    private logDir = path.join(process.cwd(), "logs");

    constructor() {
        this.ensureLogDir();
    }

    // -------------------------------
    // Ensure directory exists
    // -------------------------------
    private ensureLogDir() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch {
            // Logging must never crash app
        }
    }

    // -------------------------------
    // Safe JSON stringify
    // -------------------------------
    private safeStringify(data: unknown): string {
        try {
            return JSON.stringify(data);
        } catch {
            return JSON.stringify({
                level: "ERROR",
                message: "LOG_SERIALIZATION_FAILED"
            });
        }
    }

    // -------------------------------
    // Async write (non-blocking)
    // -------------------------------
    private write(file: string, payload: LogPayload) {
        const filePath = path.join(this.logDir, file);
        const line = this.safeStringify(payload) + "\n";

        fs.promises.appendFile(filePath, line).catch(() => {
            // Never crash app due to logging failure
        });
        console.log(line);
    }

    // -------------------------------
    // Base builder (STRICT)
    // -------------------------------
    private base(level: LogLevel, payload: Partial<LogPayload>): LogPayload {

        if (typeof payload.message !== "string" || payload.message.trim() === "") {
            throw new Error("LOGGER_MESSAGE_REQUIRED");
        }

        const base: LogPayload = {
            level,
            timestamp: new Date().toISOString(),
            message: payload.message,
        };

        if (payload.requestId) base.requestId = payload.requestId;
        if (payload.engine) base.engine = payload.engine;
        if (payload.action) base.action = payload.action;
        if (payload.meta !== undefined) base.meta = payload.meta;
        if (payload.durationMs !== undefined) base.durationMs = payload.durationMs;
        if (payload.project) base.project = payload.project;
        if (payload.procedure) base.procedure = payload.procedure;
        if (payload.db) base.db = payload.db;

        return base;
    }

    // ===============================
    // Public APIs
    // ===============================

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
        this.write(
            "api.log",
            this.base("INFO", { ...payload, engine: "api" })
        );
    }

    sql(payload: Partial<LogPayload>) {
        this.write(
            "sql.log",
            this.base("INFO", { ...payload, engine: "sql" })
        );
    }

    supabase(payload: Partial<LogPayload>) {
        this.write(
            "supabase.log",
            this.base("INFO", { ...payload, engine: "supabase" })
        );
    }
}

// ===============================
// Export Singleton
// ===============================

export const logger = new Logger();