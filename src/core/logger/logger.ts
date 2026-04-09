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
    requestId?: string;
    engine?: EngineType;
    action?: string;
    message: string;
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
            // Fail silently (logging should never crash app)
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
                error: "LOG_SERIALIZATION_FAILED"
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
    }

    // -------------------------------
    // Base builder
    // -------------------------------
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