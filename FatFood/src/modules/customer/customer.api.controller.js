"use strict";

import {
  CustomerServiceError,
  listActiveProducts,
  listNews,
  getCustomerDashboard,
  listOrdersForCustomer,
  getCustomerOrder,
  createOrderForCustomer,
  cancelCustomerOrder,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile
} from "./customer.service.js";

const handleError = (res, error) => {
  if (error instanceof CustomerServiceError) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
      code: error.code || "CUSTOMER_SERVICE_ERROR",
      detail: error.metadata
    });
  }

  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const safeMessage =
    typeof error?.message === "string" && error.message.trim().length
      ? error.message
      : "Co loi xay ra, vui long thu lai sau.";

  console.error("Customer API error:", error);

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

const resolveUserId = (req) => Number(req?.auth?.user_id || req?.session?.user?.user_id);

const listProductsHandler = async (req, res) => {
  try {
    const data = await listActiveProducts({
      search: req.query.search,
      categoryId: req.query.categoryId,
      limit: req.query.limit
    });
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listNewsHandler = async (req, res) => {
  try {
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? undefined : Math.min(parsedLimit, 50);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    const data = await listNews({
      limit,
      search: search && search.length ? search : undefined
    });
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const customerDashboardHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const data = await getCustomerDashboard(userId);
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listOrdersHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const data = await listOrdersForCustomer(userId, { status: req.query.status });
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getOrderHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const data = await getCustomerOrder(userId, req.params.orderId);
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const createOrderHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const data = await createOrderForCustomer(userId, req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const cancelOrderHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const data = await cancelCustomerOrder(userId, req.params.orderId);
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getProfileHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const data = await getProfile(userId);
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const createProfileHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const data = await createProfile(userId, req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateProfileHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const data = await updateProfile(userId, req.body || {});
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteProfileHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const data = await deleteProfile(userId);
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

export {
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
};





