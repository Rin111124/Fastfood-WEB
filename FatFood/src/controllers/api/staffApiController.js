﻿import {
  StaffServiceError,
  getStaffDashboard,
  listAssignedOrders,
  updateAssignedOrderStatus,
  toggleProductStatus,
  listSupportMessages,
  replySupportMessage,
  listInventoryItems,
  updateInventoryFromStaff,
  getStaffPerformance,
  listShiftsForStaff
} from "../../services/staffService.js";
import db from "../../models/index.js";

const { User } = db;

const toPlain = (item) => (item?.get ? item.get({ plain: true }) : item);
const toPlainList = (list = []) => list.map(toPlain);

const resolveStaffId = async (req) => {
  const authRole = req?.auth?.role;
  if (authRole === "staff" || authRole === "shipper") {
    return Number(req.auth.user_id);
  }
  if (authRole === "admin" && req.query?.staffId) {
    return Number(req.query.staffId);
  }
  if (req?.session?.user?.role === "staff") {
    return Number(req.session.user.user_id);
  }
  if (req.body?.staffId) {
    return Number(req.body.staffId);
  }
  if (req.query?.staffId) {
    return Number(req.query.staffId);
  }
  const staff = await User.findOne({ where: { role: "staff" }, attributes: ["user_id"] });
  return staff ? staff.user_id : null;
};

const handleError = (res, error) => {
  if (error instanceof StaffServiceError) {
    return res.status(400).json({ success: false, message: error.message, detail: error.metadata });
  }

  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const safeMessage =
    typeof error?.message === "string" && error.message.trim().length
      ? error.message
      : "Co loi xay ra, vui long thu lai sau.";

  console.error("Staff API error", error);

  const payload = {
    success: false,
    message: statusCode >= 500 ? "May chu dang gap su co, vui long thu lai sau." : safeMessage
  };

  if (process.env.NODE_ENV === "development") {
    payload.detail = {
      message: safeMessage,
      ...(error?.code ? { code: error.code } : {}),
      ...(error?.stack ? { stack: error.stack.split("\n").slice(0, 3) } : {})
    };
  }

  return res.status(statusCode).json(payload);
};

const staffDashboardHandler = async (req, res) => {
  try {
    const staffId = await resolveStaffId(req);
    if (!staffId) {
      return res.status(404).json({ success: false, message: "Khong tim thay nhan vien phu hop" });
    }
    const dashboard = await getStaffDashboard(staffId);
    return res.json({ success: true, data: dashboard });
  } catch (error) {
    return handleError(res, error);
  }
};

const staffOrdersHandler = async (req, res) => {
  try {
    const staffId = await resolveStaffId(req);
    if (!staffId) {
      return res.status(404).json({ success: false, message: "Khong tim thay nhan vien phu hop" });
    }
    const orders = await listAssignedOrders(staffId, { status: req.query.status });
    return res.json({ success: true, data: toPlainList(orders) });
  } catch (error) {
    return handleError(res, error);
  }
};

const staffUpdateOrderStatusHandler = async (req, res) => {
  try {
    const staffId = await resolveStaffId(req);
    if (!staffId) {
      return res.status(404).json({ success: false, message: "Khong tim thay nhan vien phu hop" });
    }
    const order = await updateAssignedOrderStatus(staffId, req.params.orderId, req.body?.status);
    return res.json({ success: true, data: toPlain(order) });
  } catch (error) {
    return handleError(res, error);
  }
};

const staffToggleProductHandler = async (req, res) => {
  try {
    const staffId = await resolveStaffId(req);
    if (!staffId) {
      return res.status(404).json({ success: false, message: "Khong tim thay nhan vien phu hop" });
    }
    const product = await toggleProductStatus(staffId, req.params.productId);
    return res.json({ success: true, data: toPlain(product) });
  } catch (error) {
    return handleError(res, error);
  }
};

const staffSupportMessagesHandler = async (req, res) => {
  try {
    const messages = await listSupportMessages();
    return res.json({ success: true, data: toPlainList(messages) });
  } catch (error) {
    return handleError(res, error);
  }
};

const staffReplySupportHandler = async (req, res) => {
  try {
    const staffId = await resolveStaffId(req);
    if (!staffId) {
      return res.status(404).json({ success: false, message: "Khong tim thay nhan vien phu hop" });
    }
    const message = await replySupportMessage(req.params.messageId, staffId, req.body?.reply);
    return res.json({ success: true, data: toPlain(message) });
  } catch (error) {
    return handleError(res, error);
  }
};

const staffInventoryHandler = async (req, res) => {
  try {
    const items = await listInventoryItems();
    return res.json({ success: true, data: toPlainList(items) });
  } catch (error) {
    return handleError(res, error);
  }
};

const staffUpdateInventoryHandler = async (req, res) => {
  try {
    const staffId = await resolveStaffId(req);
    if (!staffId) {
      return res.status(404).json({ success: false, message: "Khong tim thay nhan vien phu hop" });
    }
    const item = await updateInventoryFromStaff(req.body || {}, staffId);
    return res.json({ success: true, data: toPlain(item) });
  } catch (error) {
    return handleError(res, error);
  }
};

const staffPerformanceHandler = async (req, res) => {
  try {
    const staffId = await resolveStaffId(req);
    if (!staffId) {
      return res.status(404).json({ success: false, message: "Khong tim thay nhan vien phu hop" });
    }
    const performance = await getStaffPerformance(staffId);
    return res.json({ success: true, data: performance });
  } catch (error) {
    return handleError(res, error);
  }
};

const staffShiftsHandler = async (req, res) => {
  try {
    const staffId = await resolveStaffId(req);
    if (!staffId) {
      return res.status(404).json({ success: false, message: "Khong tim thay nhan vien phu hop" });
    }
    const shifts = await listShiftsForStaff(staffId);
    return res.json({ success: true, data: toPlainList(shifts) });
  } catch (error) {
    return handleError(res, error);
  }
};

export {
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
};

