import "dotenv/config";

console.log("STEP 1: server.ts loaded");

import app from "./app";

console.log("STEP 2: app imported");

import { logger } from "./core/logger/logger";
import { ENV } from "./config/env";

console.log("STEP 3: env loaded");

// ===============================
// SERVER START
// ===============================

const PORT = ENV.server.port;

console.log("STEP 4: before logger boot");

logger.info({
    message: "SERVER_BOOT",
    meta: {
        port: PORT,
        env: ENV.server.env,
        project: ENV.project,
    },
});

console.log("STEP 5: before listen");

app.listen(PORT, () => {
    console.log("STEP 6: listen callback reached");
    console.log(`SERVER STARTED (console fallback) on port ${PORT}`);

    logger.info({
        message: "SERVER_STARTED",
        meta: {
            port: PORT,
        },
    });
});