import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load base .env first
dotenv.config();

type DbType = "sqlserver" | "supabase";
type ProjectType = "ecom" | "school";

// Detect active project
const activeProject = (process.env.PROJECT || "ecom") as ProjectType;

// Load project-specific env file
const projectEnvPath = path.join(process.cwd(), `.env.${activeProject}`);

if (fs.existsSync(projectEnvPath)) {
    dotenv.config({ path: projectEnvPath });
    console.log(`ENV LOADED → ${projectEnvPath}`);
} else {
    console.warn(`Project env not found: ${projectEnvPath}`);
}

export const ENV = {
    server: {
        env: process.env.NODE_ENV || "development",
        port: Number(process.env.PORT || 5000),
    },

    // Active project
    project: activeProject,

    // Primary DB configuration
    db: {
        primary: (process.env.DB_PRIMARY || "sqlserver") as DbType,

        sqlserver: {
            host: process.env.DB_HOST || "",
            port: Number(process.env.DB_PORT || 1433),
            instance: process.env.DB_INSTANCE || "",
            name: process.env.DB_NAME || "",
            user: process.env.DB_USER || "",
            password: process.env.DB_PASSWORD || "",
        },

        supabase: {
            url: process.env.SUPABASE_URL || "",
            serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        },
    },

    /**
     * ENGINE DB MAPPING
     * Resolver reads from here
     */
    engineDb: {
        master: process.env.DB_MASTER_NAME || "",
        tenantDefault: process.env.DB_TENANT_DEFAULT || "",
    },
};
