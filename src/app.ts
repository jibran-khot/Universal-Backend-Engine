import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { handleError } from "./core/errors/error.handler";
import { v4 as uuidv4 } from "uuid";
import { ExecutionContext } from "./core/context";

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
// GLOBAL ERROR HANDLER (STRICT)
// ===============================

app.use(
    (err: unknown, req: Request, res: Response, _next: NextFunction) => {
        const response = handleError(err, req);
        res.status(response.statusCode || 500).json(response);
    }
);

export default app;