import { body } from "express-validator";

export const userValidator = [
    body("procedure").isString().notEmpty(),

    body("params").optional().isObject(),
    body("form").optional().isObject()
];