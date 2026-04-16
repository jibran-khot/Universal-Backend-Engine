import { Request, Response, NextFunction } from "express";
import { run } from "../core/run";
import { validateRequest } from "../core/validation/validator";

/* ============================
   TYPES
============================ */

type CrudPayload = {
    project?: string;
    procedure: string;
    params?: Record<string, unknown>;
    form?: Record<string, unknown>;
};

/* ============================
   VALIDATOR (STRICT)
============================ */

export const validateCrudRequest = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    try {
        // reuse engine validator (single source of truth)
        validateRequest({
            action: {
                procedure: req.body?.procedure,
                params: req.body?.params,
                form: req.body?.form,
            },
            project: req.body?.project,
        });

        next();
    } catch (err) {
        next(err);
    }
};

/* ============================
   HANDLER (STRICT PIPELINE)
============================ */

export const doCrudAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const payload = req.body as CrudPayload;

        const result = await run({
            action: {
                procedure: payload.procedure,
                params: payload.params,
                form: payload.form,
            },
            project: payload.project,
        });

        res.status(result.statusCode || 200).json(result);

    } catch (err: unknown) {
        next(err);
    }
};