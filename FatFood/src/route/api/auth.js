import express from "express";
import { loginHandler, signupHandler } from "../../controllers/authController.js";

const router = express.Router();

router.post("/login", loginHandler);
router.post("/signup", signupHandler);

export default router;
