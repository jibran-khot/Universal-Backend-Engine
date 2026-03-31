import fs from "fs";
import path from "path";

type EngineConfig = {
    engine: {
        name: string;
        version: string;
        mode: "sql-first";
    };
    database: {
        strategy: "multi-tenant";
        default: "MASTER" | "TENANT";
        mapping: Record<
            string,
            {
                type: "sql" | "supabase";
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

let cachedConfig: EngineConfig | null = null;

/**
 * Load engine.config.json once and cache it
 */
export function loadEngineConfig(): EngineConfig {
    if (cachedConfig) return cachedConfig;

    const configPath = path.join(
        process.cwd(),
        "src",
        "config",
        "engine.config.json"
    );

    if (!fs.existsSync(configPath)) {
        throw new Error("engine.config.json not found. Engine cannot start.");
    }

    const raw = fs.readFileSync(configPath, "utf-8");

    try {
        const parsed: EngineConfig = JSON.parse(raw);

        validateEngineConfig(parsed);

        cachedConfig = parsed;
        return parsed;
    } catch (err) {
        throw new Error("Invalid engine.config.json format.");
    }
}

/**
 * Basic validation
 */
function validateEngineConfig(config: EngineConfig) {
    if (!config.engine?.name) throw new Error("Engine name missing");
    if (!config.database?.strategy)
        throw new Error("Database strategy missing");
    if (!config.database?.mapping)
        throw new Error("Database mapping missing");
}

/**
 * Accessor
 */
export function getEngineConfig(): EngineConfig {
    if (!cachedConfig) {
        return loadEngineConfig();
    }
    return cachedConfig;
}
