import express from "express";
import authRoutes from "./auth.js";
import adminRoutes from "./admin.js";
import staffRoutes from "./staff.js";
import customerRoutes from "./customer.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/staff", staffRoutes);
router.use("/customer", customerRoutes);

const initApiRoutes = (app) => app.use("/api", router);

export default initApiRoutes;
