import express from "express";
import {
  listProductsHandler,
  customerDashboardHandler,
  listOrdersHandler,
  getOrderHandler,
  createOrderHandler,
  cancelOrderHandler,
  getProfileHandler,
  updateProfileHandler
} from "../../controllers/api/customerApiController.js";
import { requireRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/products", listProductsHandler);
router.get("/dashboard", customerDashboardHandler);

router.use(requireRoles("customer", "admin"));

router.get("/me", getProfileHandler);
router.patch("/me", updateProfileHandler);

router.get("/orders", listOrdersHandler);
router.post("/orders", createOrderHandler);
router.get("/orders/:orderId", getOrderHandler);
router.post("/orders/:orderId/cancel", cancelOrderHandler);

export default router;
