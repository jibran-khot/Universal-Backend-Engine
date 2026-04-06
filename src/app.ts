import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { errorHandler } from "./core/errors/error.handler";
import { v4 as uuidv4 } from "uuid";

const app = express();

/**
 * ============================================================
 * SECURITY MIDDLEWARE
 * ============================================================
 *
 * helmet:
 * - Sets secure HTTP headers
 * - Protects against common vulnerabilities
 */
app.use(helmet());

/**
 * ============================================================
 * CORS CONFIGURATION
 * ============================================================
 *
 * Allows cross-origin requests (Angular frontend, etc.)
 * Can be restricted later for production domains
 */
app.use(cors());

/**
 * ============================================================
 * BODY PARSER (JSON)
 * ============================================================
 *
 * Parses incoming JSON payloads
 * Limit prevents large payload attacks (DoS protection)
 */
app.use(
    express.json({
        limit: "1mb",
    })
);

/**
 * ============================================================
 * REQUEST CONTEXT MIDDLEWARE
 * ============================================================
 *
 * Attaches metadata to every request:
 * - requestId → unique identifier for tracing
 * - startTime → used for performance logging
 *
 * This context flows through:
 * routes → run → executor → logger
 */
app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).context = {
        requestId: uuidv4(),
        startTime: Date.now(),
    };
    next();
});

/**
 * ============================================================
 * HEALTH CHECK ENDPOINT
 * ============================================================
 *
 * Used by:
 * - Load balancers
 * - Monitoring systems
 * - Kubernetes readiness probes
 */
app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
        status: "OK",
        uptime: process.uptime(),
    });
});

/**
 * ============================================================
 * ROUTE MOUNTING
 * ============================================================
 *
 * All API routes are prefixed with /api
 * Example:
 * POST /api/run
 */
app.use("/api", routes);

/**
 * ============================================================
 * 404 HANDLER
 * ============================================================
 *
 * Handles unknown routes
 * Must be after all route definitions
 */
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        status: "FAIL",
        message: "Route not found",
    });
});

/**
 * ============================================================
 * GLOBAL ERROR HANDLER
 * ============================================================
 *
 * Centralized error processing:
 * - Formats response
 * - Logs errors
 * - Maps engine errors
 *
 * MUST be the last middleware
 */
app.use(errorHandler);

export default app;