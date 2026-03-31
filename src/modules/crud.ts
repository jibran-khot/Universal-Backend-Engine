import { Request, Response, NextFunction } from "express";
import { runProcedure } from "../core/executor";

/* ============================
   TYPES
============================ */

export interface DoCrudActionPayload {
    project?: string;
    procedure: string;
    params?: Record<string, any>;
    form?: Record<string, any>;
}

/* ============================
   VALIDATORS
============================ */

const validateCrudPayload = (payload: any): boolean => {
    if (!payload || typeof payload !== "object") return false;

    if (!payload.procedure || typeof payload.procedure !== "string") {
        return false;
    }

    if (payload.params && typeof payload.params !== "object") {
        return false;
    }

    if (payload.form && typeof payload.form !== "object") {
        return false;
    }

    return true;
};

export const validateCrudRequest = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!validateCrudPayload(req.body)) {
        return res.status(400).json({
            StatusCode: 400,
            Message: "Invalid CRUD payload",
            DataSet: [],
        });
    }

    next();
};

/* ============================
   HANDLER
============================ */

export const doCrudAction = async (req: Request, res: Response) => {
    try {
        const payload: DoCrudActionPayload = req.body;

        const result = await runProcedure({
            project: payload.project,
            procedure: payload.procedure,
            params: payload.params || {},
            form: payload.form || {},
        });

        res.status(200).json(result);
    } catch (err: any) {
        res.status(500).json({
            StatusCode: 500,
            Message: err.message,
            DataSet: [],
        });
    }
};
