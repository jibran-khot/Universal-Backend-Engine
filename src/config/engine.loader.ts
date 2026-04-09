import fs from "fs";
import path from "path";

// ===============================
// Types
// ===============================

type DbType = "MASTER" | "TENANT";
type EngineType = "sql" | "supabase";

type EngineConfig = {
    engine: {
        name: string;
        version: string;
        mode: "sql-first";
    };
    database: {
        strategy: "multi-tenant";
        default: DbType;
        mapping: Record<
            DbType,
            {
                type: EngineType;
                envKey: string;
            }
        >;
    };
    features: {
        auth: boolean;
        logging: boolean;
        rbac: boolean;
        fileUpload: boolean;
        caching: boolean;
    };
    execution: {
        retryOnFail: boolean;
        timeoutMs: number;
        datasetNormalization: boolean;
    };
};

// ===============================
// Cache
// ===============================

let cachedConfig: EngineConfig | null = null;

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
    } catch (err) {
        throw new Error(
            "CONFIG_ERROR: Failed to read engine.config.json"
        );
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(
            "CONFIG_ERROR: Invalid JSON format in engine.config.json"
        );
    }

    validateEngineConfig(parsed);

    cachedConfig = parsed;
    return parsed;
}

// ===============================
// Validation
// ===============================

function validateEngineConfig(config: unknown): asserts config is EngineConfig {

    if (!config || typeof config !== "object") {
        throw new Error("CONFIG_ERROR: Config must be an object");
    }

    const c = config as EngineConfig;

    // Engine
    if (!c.engine?.name) {
        throw new Error("CONFIG_ERROR: engine.name missing");
    }

    if (!c.engine?.version) {
        throw new Error("CONFIG_ERROR: engine.version missing");
    }

    if (c.engine?.mode !== "sql-first") {
        throw new Error("CONFIG_ERROR: engine.mode must be 'sql-first'");
    }

    // Database
    if (c.database?.strategy !== "multi-tenant") {
        throw new Error("CONFIG_ERROR: database.strategy must be 'multi-tenant'");
    }

    if (!c.database?.mapping) {
        throw new Error("CONFIG_ERROR: database.mapping missing");
    }

    // Validate mapping keys
    const requiredKeys: DbType[] = ["MASTER", "TENANT"];

    for (const key of requiredKeys) {
        const entry = c.database.mapping[key];

        if (!entry) {
            throw new Error(`CONFIG_ERROR: mapping missing for ${key}`);
        }

        if (!["sql", "supabase"].includes(entry.type)) {
            throw new Error(
                `CONFIG_ERROR: invalid engine type for ${key}`
            );
        }

        if (!entry.envKey) {
            throw new Error(
                `CONFIG_ERROR: envKey missing for ${key}`
            );
        }
    }

    // Execution
    if (typeof c.execution?.timeoutMs !== "number") {
        throw new Error("CONFIG_ERROR: execution.timeoutMs must be number");
    }

    // Features (optional strictness)
    if (!c.features) {
        throw new Error("CONFIG_ERROR: features config missing");
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