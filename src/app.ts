import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { errorHandler } from "./core/errors/error.handler";
import { v4 as uuidv4 } from "uuid";

const app = express();

app.use(helmet());

app.use(cors());

app.use(
    express.json({
        limit: "1mb",
    })
);

app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).context = {
        requestId: uuidv4(),
        startTime: Date.now(),
    };
    next();
});

app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
        status: "OK",
        uptime: process.uptime(),
    });
});

app.use("/api", routes);

app.use((_req: Request, res: Response) => {
    res.status(404).json({
        status: "FAIL",
        message: "Route not found",
    });
});

app.use(errorHandler);

export default app;