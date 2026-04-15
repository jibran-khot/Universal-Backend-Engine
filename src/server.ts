import "dotenv/config";
import app from "./app";
import { logger } from "./core/logger/logger";
import { ENV } from "./config/env";

// ===============================
// SERVER START
// ===============================

const PORT = ENV.server.port;

logger.info({
    message: "SERVER_BOOT",
    meta: {
        port: PORT,
        env: ENV.server.env,
        project: ENV.project,
    },
});

app.listen(PORT, () => {
    logger.info({
        message: "SERVER_STARTED",
        meta: {
            port: PORT,
        },
    });
});