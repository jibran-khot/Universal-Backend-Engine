import "dotenv/config";

import app from "./app";
import { logger } from "./core/logger/logger";
import { ENV } from "./config/env";

// ===============================
// SERVER CONFIG
// ===============================

const PORT = ENV.server.port || 3000;

// ===============================
// PROCESS LEVEL SAFETY
// ===============================

process.on("uncaughtException", (error: Error) => {
    logger.error({
        message: "UNCAUGHT_EXCEPTION",
        meta: error, // ✅ FIXED
    });

    process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
    logger.error({
        message: "UNHANDLED_REJECTION",
        meta: reason, // ✅ FIXED
    });

    process.exit(1);
});

// ===============================
// SERVER START
// ===============================

const server = app.listen(PORT, () => {
    logger.info({
        message: "SERVER_STARTED",
        meta: {
            port: PORT,
            env: ENV.server.env,
            project: ENV.project,
        },
    });
});

// ===============================
// GRACEFUL SHUTDOWN
// ===============================

const shutdown = (signal: string) => {
    logger.warn({
        message: "SHUTDOWN_INITIATED",
        meta: { signal },
    });

    server.close(() => {
        logger.info({
            message: "SERVER_CLOSED",
        });

        process.exit(0);
    });

    setTimeout(() => {
        logger.error({
            message: "FORCE_SHUTDOWN",
        });
        process.exit(1);
    }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);