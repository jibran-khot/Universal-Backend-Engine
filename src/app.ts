import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import routes from "./routes";
import { handleError } from "./core/errors/error.handler";
import { v4 as uuidv4 } from "uuid";
import { ExecutionContext } from "./core/context";
import { logger } from "./core/logger/logger";

const app = express();

// ===============================
// TYPES (LOCAL, NON-INTRUSIVE)
// ===============================

type RequestWithContext = Request & {
    __ctx?: ExecutionContext;
};

// ===============================
// SECURITY
// ===============================

app.set("trust proxy", 1);

app.use(
    helmet({
        crossOriginResourcePolicy: false,
    })
);

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// ===============================
// PERFORMANCE
// ===============================

app.use(compression());

// ===============================
// BODY PARSER (STRICT LIMIT)
// ===============================

app.use(
    express.json({
        limit: "1mb",
        strict: true,
    })
);

// ===============================
// REQUEST CONTEXT (STRICT + IMMUTABLE)
// ===============================

app.use((req: Request, _res: Response, next: NextFunction) => {
    const ctx: ExecutionContext = Object.freeze({
        requestId: uuidv4(),
        startTime: Date.now(),
    });

    (req as RequestWithContext).__ctx = ctx;

    next();
});

// ===============================
// REQUEST LOGGING (LIGHTWEIGHT)
// ===============================

app.use((req: Request, res: Response, next: NextFunction) => {
    const ctx = (req as RequestWithContext).__ctx;

    logger.info({
        requestId: ctx?.requestId,
        message: "REQUEST_START",
        meta: {
            method: req.method,
            url: req.originalUrl,
        },
    });

    res.on("finish", () => {
        logger.info({
            requestId: ctx?.requestId,
            message: "REQUEST_END",
            meta: {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                durationMs: Date.now() - (ctx?.startTime || Date.now()),
            },
        });
    });

    next();
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
        status: "OK",
        uptime: process.uptime(),
    });
});

// ===============================
// ROUTES
// ===============================

app.use("/api", routes);

// ===============================
// 404 HANDLER (STANDARDIZED)
// ===============================

app.use((_req: Request, res: Response) => {
    res.status(404).json({
        status: {
            code: 404,
            success: false,
            message: "Route not found",
        },
        error: {
            code: "NOT_FOUND", message: "Route path not found",
        },
    });
});

app.use(
    (err: unknown, req: Request, res: Response, _next: NextFunction) => {
        const ctx = (req as RequestWithContext).__ctx;
        logger.error({
            requestId: ctx?.requestId,
            message: "UNHANDLED_ERROR",
            meta: err,
        });
        const response = handleError(err, req);
        res.status(response.statusCode || 500).json(response);
    }
);

export default app;