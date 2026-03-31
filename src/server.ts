import "dotenv/config";
import app from "./app";
import { logger } from "./core/logger/logger";

const PORT = process.env.PORT || 3000;

logger.info({
    message: "SERVER_BOOT",
});

app.listen(PORT, () => {
    console.log(`🚀 Backend API running on port ${PORT}`);
});
