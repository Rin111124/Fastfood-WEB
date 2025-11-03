import express from "express";
import {
  listProductsHandler,
  listNewsHandler,
  customerDashboardHandler,
  listOrdersHandler,
  getOrderHandler,
  createOrderHandler,
  cancelOrderHandler,
  getProfileHandler,
  createProfileHandler,
  updateProfileHandler,
  deleteProfileHandler
} from "./customer.api.controller.js";
import { requireRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/products", listProductsHandler);
router.get("/news", listNewsHandler);
router.get("/dashboard", requireRoles("customer", "admin"), customerDashboardHandler);

router.use(requireRoles("customer", "admin"));

router.get("/me", getProfileHandler);
router.post("/me", createProfileHandler);
router.patch("/me", updateProfileHandler);
router.delete("/me", deleteProfileHandler);

router.get("/orders", listOrdersHandler);
router.post("/orders", createOrderHandler);
router.get("/orders/:orderId", getOrderHandler);
router.post("/orders/:orderId/cancel", cancelOrderHandler);

export default router;


