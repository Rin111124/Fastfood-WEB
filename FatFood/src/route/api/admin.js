import express from "express";
import {
  dashboardHandler,
  listUsersHandler,
  createUserHandler,
  updateUserHandler,
  setUserStatusHandler,
  deleteUserHandler,
  restoreUserHandler,
  resetPasswordHandler,
  sendResetEmailHandler,
  listStaffHandler,
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
  listProductsHandler,
  createProductHandler,
  updateProductHandler,
  toggleProductHandler,
  deleteProductHandler,
  listProductOptionsHandler,
  createProductOptionHandler,
  updateProductOptionHandler,
  toggleProductOptionAvailabilityHandler,
  deleteProductOptionHandler,
  listOrdersHandler,
  assignOrderHandler,
  updateOrderStatusHandler,
  refundOrderHandler,
  listPromotionsHandler,
  createPromotionHandler,
  updatePromotionHandler,
  togglePromotionHandler,
  reportOverviewHandler,
  listSettingsHandler,
  upsertSettingsHandler,
  listLogsHandler,
  listInventoryHandler,
  upsertInventoryHandler,
  listBackupsHandler,
  createBackupHandler,
  restoreBackupHandler,
  listShiftsHandler,
  scheduleShiftHandler
} from "../../controllers/api/adminApiController.js";
import { requireRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireRoles("admin"));

// dashboard & reports
router.get("/dashboard", dashboardHandler);
router.get("/reports/overview", reportOverviewHandler);

// users
router.get("/users", listUsersHandler);
router.post("/users", createUserHandler);
router.put("/users/:userId", updateUserHandler);
router.patch("/users/:userId/status", setUserStatusHandler);
router.delete("/users/:userId", deleteUserHandler);
router.post("/users/:userId/restore", restoreUserHandler);
router.post("/users/:userId/reset-password", resetPasswordHandler);
router.post("/users/:userId/send-reset-email", sendResetEmailHandler);
router.get("/staff", listStaffHandler);

// categories
router.get("/categories", listCategoriesHandler);
router.post("/categories", createCategoryHandler);
router.put("/categories/:categoryId", updateCategoryHandler);
router.delete("/categories/:categoryId", deleteCategoryHandler);

// products & options
router.get("/products", listProductsHandler);
router.post("/products", createProductHandler);
router.put("/products/:productId", updateProductHandler);
router.patch("/products/:productId/availability", toggleProductHandler);
router.post("/products/:productId/toggle", toggleProductHandler);
router.delete("/products/:productId", deleteProductHandler);

router.get("/product-options", listProductOptionsHandler);
router.post("/product-options", createProductOptionHandler);
router.put("/product-options/:optionId", updateProductOptionHandler);
router.patch("/product-options/:optionId/availability", toggleProductOptionAvailabilityHandler);
router.delete("/product-options/:optionId", deleteProductOptionHandler);

// orders
router.get("/orders", listOrdersHandler);
router.post("/orders/:orderId/assign", assignOrderHandler);
router.patch("/orders/:orderId/status", updateOrderStatusHandler);
router.post("/orders/:orderId/refund", refundOrderHandler);

// promotions
router.get("/promotions", listPromotionsHandler);
router.post("/promotions", createPromotionHandler);
router.put("/promotions/:promoId", updatePromotionHandler);
router.post("/promotions/:promoId/toggle", togglePromotionHandler);

// system settings & logs
router.get("/settings", listSettingsHandler);
router.post("/settings", upsertSettingsHandler);
router.get("/logs", listLogsHandler);

// inventory
router.get("/inventory", listInventoryHandler);
router.post("/inventory", upsertInventoryHandler);

// backups
router.get("/backups", listBackupsHandler);
router.post("/backups", createBackupHandler);
router.post("/backups/:fileName/restore", restoreBackupHandler);

// staff shifts
router.get("/shifts", listShiftsHandler);
router.post("/shifts", scheduleShiftHandler);

export default router;
