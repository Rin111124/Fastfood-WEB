"use strict";

import { clearCart } from "../customer/customer.service.js";
import { logAction } from "../admin/admin.service.js";
import { assignOrderToOnDutyStaff } from "./orderAssignment.helper.js";

const clearCustomerCart = async (userId) => {
  if (!userId) return null;
  try {
    return await clearCart(userId);
  } catch (error) {
    console.error("Failed to clear cart after payment:", error);
    return null;
  }
};

const recordPaymentActivity = async (order, provider, metadata = {}) => {
  if (!order) return null;
  try {
    await logAction(order.user_id || null, "PAYMENT_CONFIRMED", "orders", {
      orderId: order.order_id,
      provider,
      ...metadata
    });
  } catch (error) {
    console.error("Failed to log payment activity:", error);
  }
};

export { assignOrderToOnDutyStaff, clearCustomerCart, recordPaymentActivity };
