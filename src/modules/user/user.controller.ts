import { Request, Response, NextFunction } from "express";
import { run } from "../../core/run";
import { userMapper } from "./user.mapper";
import { EngineRequest } from "../../core/contract/request";

type RequestWithMeta = Request & {
    __ctx?: any;
    __auth?: any;
    __token?: string;
};

export const userController = {

    handle: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const r = req as RequestWithMeta;

            /**
             * Build EngineRequest (STRICT)
             */
            const engineRequest: EngineRequest = userMapper.build(
                req.body,
                r.__ctx,
                r.__auth,
                r.__token
            );

            const result = await run(engineRequest);

            res.json(result);

        } catch (err) {
            next(err);
        }
    }

};