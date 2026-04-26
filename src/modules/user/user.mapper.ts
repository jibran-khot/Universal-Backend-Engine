import { EngineRequest } from "../../core/contract/request";
import { ExecutionContext } from "../../core/context";

export const userMapper = {

    build: (
        body: any,
        ctx: ExecutionContext,
        auth: any,
        token?: string
    ): EngineRequest => {

        return Object.freeze({
            project: "ecom",

            /**
             * INTERNAL ENGINE HOOKS (REQUIRED)
             */
            __ctx: ctx,
            __auth: auth,
            __token: token,

            /**
             * AUTH BLOCK (OPTIONAL — ENGINE SAFE)
             */
            auth: Object.freeze({
                token,
                userId: auth?.identity?.userId,
                companyDb: auth?.identity?.companyDb
            }),

            /**
             * ACTION BLOCK (CORE)
             */
            action: Object.freeze({
                procedure: body.procedure,
                params: Object.freeze({
                    ...body.params
                }),
                form: Object.freeze({
                    ...body.form
                })
            })
        } as unknown as EngineRequest);
    }

};