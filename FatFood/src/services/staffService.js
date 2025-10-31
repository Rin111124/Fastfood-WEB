"use strict";

import db from "../models/index.js";
import { AdminServiceError, toggleProductAvailability, listInventory, upsertInventoryItem, listStaffShifts } from "./adminService.js";

const {
  User,
  Order,
  OrderItem,
  Product,
  Message,
  StaffShift
} = db;

class StaffServiceError extends Error {
  constructor(message, metadata = {}) {
    super(message);
    this.name = "StaffServiceError";
    this.metadata = metadata;
  }
}

const ensureStaffUser = async (staffId) => {
  const user = await User.findByPk(staffId, { paranoid: false });
  if (!user || !["staff", "shipper"].includes(user.role)) {
    throw new StaffServiceError("Nhan vien khong hop le", { staffId });
  }
  return user;
};

const getStaffDashboard = async (staffId) => {
  await ensureStaffUser(staffId);

  const [assigned, completed, canceled, upcomingShiftsRaw] = await Promise.all([
    Order.count({ where: { assigned_staff_id: staffId } }),
    Order.count({ where: { assigned_staff_id: staffId, status: "completed" } }),
    Order.count({ where: { assigned_staff_id: staffId, status: "canceled" } }),
    StaffShift.findAll({
      where: { staff_id: staffId },
      order: [["shift_date", "ASC"]],
      limit: 5
    })
  ]);

  const upcomingShifts = upcomingShiftsRaw.map((shift) => shift.get({ plain: true }));

  return {
    assigned,
    completed,
    canceled,
    upcomingShifts
  };
};

const listAssignedOrders = async (staffId, { status } = {}) => {
  await ensureStaffUser(staffId);
  const where = { assigned_staff_id: staffId };
  if (status && status !== "all") {
    where.status = status;
  }
  const orders = await Order.findAll({
    where,
    include: [
      { model: User, attributes: ["user_id", "username", "full_name"] },
      {
        model: OrderItem,
        include: [{ model: Product, attributes: ["name", "image_url"] }]
      }
    ],
    order: [["created_at", "DESC"]]
  });

  return orders.map((order) => order.get({ plain: true }));
};

const updateAssignedOrderStatus = async (staffId, orderId, status) => {
  await ensureStaffUser(staffId);
  const order = await Order.findOne({ where: { order_id: orderId, assigned_staff_id: staffId } });
  if (!order) {
    throw new StaffServiceError("Ban khong duoc phep cap nhat don hang nay", { orderId });
  }
  order.status = status;
  await order.save();
  return order.get({ plain: true });
};

const toggleProductStatus = async (staffId, productId) => {
  await ensureStaffUser(staffId);
  return toggleProductAvailability(productId, staffId);
};

const listSupportMessages = async () => {
  const messages = await Message.findAll({
    include: [{ model: User, attributes: ["user_id", "username", "full_name"] }],
    order: [["created_at", "DESC"]],
    paranoid: false
  });
  return messages.map((msg) => msg.get({ plain: true }));
};

const replySupportMessage = async (messageId, staffId, reply) => {
  await ensureStaffUser(staffId);
  const message = await Message.findByPk(messageId, { paranoid: false });
  if (!message) {
    throw new StaffServiceError("Khong tim thay tin nhan", { messageId });
  }
  message.reply = reply;
  message.from_role = "staff";
  await message.save();
  return message.get({ plain: true });
};

const listInventoryItems = async () => {
  const items = await listInventory();
  return items.map((item) => item.get ? item.get({ plain: true }) : item);
};

const updateInventoryFromStaff = async (payload, staffId) => {
  await ensureStaffUser(staffId);
  return upsertInventoryItem({ ...payload, updated_by: staffId }, staffId);
};

const getStaffPerformance = async (staffId) => {
  await ensureStaffUser(staffId);
  const [completedOrders, totalOrders] = await Promise.all([
    Order.count({ where: { assigned_staff_id: staffId, status: "completed" } }),
    Order.count({ where: { assigned_staff_id: staffId } })
  ]);

  const completionRate = totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0;

  return {
    completedOrders,
    totalOrders,
    completionRate,
    rating: "N/A"
  };
};

const listShiftsForStaff = async (staffId) => {
  await ensureStaffUser(staffId);
  const all = await listStaffShifts();
  return all.filter((shift) => shift.staff_id === staffId).map((shift) => shift.get({ plain: true }));
};

export {
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
};
