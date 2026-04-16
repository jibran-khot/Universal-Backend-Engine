import fs from "fs";
import path from "path";

// ===============================
// Types
// ===============================

type DbType = "MASTER" | "TENANT";
type EngineType = "sql" | "supabase";

type EngineConfig = Readonly<{
    engine: Readonly<{
        name: string;
        version: string;
        mode: "sql-first";
    }>;
    database: Readonly<{
        strategy: "multi-tenant";
        default: DbType;
        mapping: Record<
            DbType,
            Readonly<{
                type: EngineType;
                envKey: string;
            }>
        >;
    }>;
    features: Readonly<{
        auth: boolean;
        logging: boolean;
        rbac: boolean;
        fileUpload: boolean;
        caching: boolean;
    }>;
    execution: Readonly<{
        retryOnFail: boolean;
        timeoutMs: number;
        datasetNormalization: boolean;
    }>;
}>;

// ===============================
// Cache
// ===============================

let cachedConfig: EngineConfig | null = null;

// ===============================
// Helpers
// ===============================

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function deepFreeze<T>(obj: T): T {
    if (isObject(obj)) {
        Object.freeze(obj);
        for (const key of Object.keys(obj)) {
            const value = (obj as Record<string, unknown>)[key];
            if (isObject(value)) {
                deepFreeze(value);
            }
        }
    }
    return obj;
}

// ===============================
// Loader
// ===============================

export function loadEngineConfig(): EngineConfig {

    if (cachedConfig) return cachedConfig;

    const configPath = path.join(
        process.cwd(),
        "src",
        "config",
        "engine.config.json"
    );

    if (!fs.existsSync(configPath)) {
        throw new Error(
            "CONFIG_ERROR: engine.config.json not found. Engine cannot start."
        );
    }

    let raw: string;

    try {
        raw = fs.readFileSync(configPath, "utf-8");
    } catch {
        throw new Error(
            "CONFIG_ERROR: Failed to read engine.config.json"
        );
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(
            "CONFIG_ERROR: Invalid JSON format in engine.config.json"
        );
    }

    validateEngineConfig(parsed);

    const frozen = deepFreeze(parsed) as EngineConfig;

    cachedConfig = frozen;

    return frozen;
}

// ===============================
// Validation
// ===============================

function validateEngineConfig(config: unknown): asserts config is EngineConfig {

    if (!isObject(config)) {
        throw new Error("CONFIG_ERROR: Config must be an object");
    }

    const c = config as Record<string, unknown>;

    const engine = c["engine"];
    const database = c["database"];
    const features = c["features"];
    const execution = c["execution"];

    if (!isObject(engine) || typeof engine["name"] !== "string") {
        throw new Error("CONFIG_ERROR: engine.name missing");
    }

    if (typeof engine["version"] !== "string") {
        throw new Error("CONFIG_ERROR: engine.version missing");
    }

    if (engine["mode"] !== "sql-first") {
        throw new Error("CONFIG_ERROR: engine.mode must be 'sql-first'");
    }

    if (!isObject(database) || database["strategy"] !== "multi-tenant") {
        throw new Error("CONFIG_ERROR: database.strategy must be 'multi-tenant'");
    }

    const mapping = database["mapping"];

    if (!isObject(mapping)) {
        throw new Error("CONFIG_ERROR: database.mapping missing");
    }

    const requiredKeys: DbType[] = ["MASTER", "TENANT"];

    for (const key of requiredKeys) {
        const entry = (mapping as Record<string, unknown>)[key];

        if (!isObject(entry)) {
            throw new Error(`CONFIG_ERROR: mapping missing for ${key}`);
        }

        const type = entry["type"];
        const envKey = entry["envKey"];

        if (type !== "sql" && type !== "supabase") {
            throw new Error(`CONFIG_ERROR: invalid engine type for ${key}`);
        }

        if (typeof envKey !== "string" || envKey.trim() === "") {
            throw new Error(`CONFIG_ERROR: envKey missing for ${key}`);
        }
    }

    if (!isObject(features)) {
        throw new Error("CONFIG_ERROR: features config missing");
    }

    if (
        !isObject(execution) ||
        typeof execution["timeoutMs"] !== "number"
    ) {
        throw new Error("CONFIG_ERROR: execution.timeoutMs must be number");
    }
}

// ===============================
// Accessor
// ===============================

export function getEngineConfig(): EngineConfig {
    if (!cachedConfig) {
        return loadEngineConfig();
    }
    return cachedConfig;
}