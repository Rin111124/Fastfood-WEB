import express from "express";
import {
  staffDashboardHandler,
  staffOrdersHandler,
  staffUpdateOrderStatusHandler,
  staffToggleProductHandler,
  staffSupportMessagesHandler,
  staffReplySupportHandler,
  staffInventoryHandler,
  staffUpdateInventoryHandler,
  staffPerformanceHandler,
  staffShiftsHandler
} from "../../controllers/api/staffApiController.js";
import { requireRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireRoles("staff", "admin"));

router.get("/dashboard", staffDashboardHandler);
router.get("/orders", staffOrdersHandler);
router.patch("/orders/:orderId/status", staffUpdateOrderStatusHandler);
router.post("/menu/:productId/toggle", staffToggleProductHandler);
router.get("/support/messages", staffSupportMessagesHandler);
router.post("/support/:messageId/reply", staffReplySupportHandler);
router.get("/inventory", staffInventoryHandler);
router.post("/inventory", staffUpdateInventoryHandler);
router.get("/performance", staffPerformanceHandler);
router.get("/shifts", staffShiftsHandler);

export default router;
