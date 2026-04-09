import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { handleError } from "./core/errors/error.handler";
import { v4 as uuidv4 } from "uuid";
import { ExecutionContext } from "./core/context";

const app = express();

// ===============================
// SECURITY
// ===============================

app.use(helmet());
app.use(cors());

// ===============================
// BODY PARSER
// ===============================

app.use(
    express.json({
        limit: "1mb",
    })
);

// ===============================
// REQUEST CONTEXT (FIXED 🔥)
// ===============================

app.use((req: Request, _res: Response, next: NextFunction) => {

    const ctx: ExecutionContext = {
        requestId: uuidv4(),
        startTime: Date.now(),
    };

    (req as unknown as { __ctx?: ExecutionContext }).__ctx = ctx;

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
            code: "NOT_FOUND",
            message: "Route not found",
        },
    });
});

// ===============================
// GLOBAL ERROR HANDLER (FIXED 🔥)
// ===============================

app.use(
    (err: unknown, req: Request, res: Response, _next: NextFunction) => {

        const response = handleError(err, req);

        res.status(response.statusCode || 500).json(response);
    }
);

export default app;