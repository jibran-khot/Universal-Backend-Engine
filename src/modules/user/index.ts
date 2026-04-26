import { Router } from "express";
import { userController } from "./user.controller";

const router = Router();

/**
 * Single entry point (engine expects full request body)
 */
router.post("/user", userController.handle);

export default router;