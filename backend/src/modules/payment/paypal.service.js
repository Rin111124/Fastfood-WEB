"use strict";

import paypal from "@paypal/checkout-server-sdk";
import db from "../../models/index.js";

const { Order, Payment, sequelize } = db;

class PaypalServiceError extends Error {
  constructor(message, statusCode = 400, code = "PAYPAL_ERROR", metadata = {}) {
    super(message);
    this.name = "PaypalServiceError";
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
  }
}

const ensurePaypalConfig = () => {
  const cfg = {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    webhookId: process.env.PAYPAL_WEBHOOK_ID || "",
    currency: process.env.PAYPAL_CURRENCY || "USD",
    returnUrl: process.env.PAYPAL_RETURN_URL || "http://localhost:3000/api/payments/paypal/return",
    cancelUrl: process.env.PAYPAL_CANCEL_URL || "http://localhost:3000/api/payments/paypal/cancel"
  };

  if (!cfg.clientId || !cfg.clientSecret) {
    throw new PaypalServiceError("Thieu cau hinh PAYPAL_CLIENT_ID hoac PAYPAL_CLIENT_SECRET", 500, "PAYPAL_CONFIG_MISSING");
  }
  return cfg;
};

let cachedClient = null;

const getPaypalClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const { clientId, clientSecret } = ensurePaypalConfig();
  const environment =
    (process.env.PAYPAL_ENVIRONMENT || "").toLowerCase() === "live"
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);
  cachedClient = new paypal.core.PayPalHttpClient(environment);
  return cachedClient;
};

const formatCurrencyValue = (amount) => {
  const value = Number(amount || 0);
  return value.toFixed(2);
};

const createPaypalOrder = async (orderId) => {
  const cfg = ensurePaypalConfig();
  const order = await Order.findByPk(orderId);
  if (!order) {
    throw new PaypalServiceError("Khong tim thay don hang", 404, "ORDER_NOT_FOUND", { orderId });
  }

  if (["canceled", "refunded"].includes(order.status)) {
    throw new PaypalServiceError("Don hang khong hop le de thanh toan", 400, "ORDER_INVALID_STATUS", { status: order.status });
  }

  const amountValue = formatCurrencyValue(order.total_amount);
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: `ORDER-${orderId}`,
        amount: {
          currency_code: cfg.currency.toUpperCase(),
          value: amountValue
        }
      }
    ],
    application_context: {
      return_url: cfg.returnUrl,
      cancel_url: cfg.cancelUrl,
      user_action: "PAY_NOW"
    }
  });

  const client = getPaypalClient();
  const response = await client.execute(request);
  const approvalUrl = response?.result?.links?.find((link) => link.rel === "approve")?.href;
  if (!approvalUrl) {
    throw new PaypalServiceError("Khong lay duoc duong dan thanh toan PayPal", 500, "PAYPAL_APPROVAL_URL_MISSING");
  }

  await Payment.create({
    order_id: orderId,
    provider: "paypal",
    amount: Number(order.total_amount || 0),
    currency: cfg.currency.toUpperCase(),
    txn_ref: response.result.id,
    status: "initiated",
    meta: {
      paypal_order: response.result
    }
  });

  return { approvalUrl, paypalOrderId: response.result.id };
};

const markPaymentAsSuccess = async (paypalOrderId, capturePayload = {}) => {
  const payment = await Payment.findOne({ where: { txn_ref: paypalOrderId } });
  if (!payment) {
    return null;
  }

  await payment.update({
    status: "success",
    meta: {
      ...(payment.meta || {}),
      paypal_capture: capturePayload
    }
  });

  if (payment.order_id) {
    await sequelize.transaction(async (t) => {
      const order = await Order.findByPk(payment.order_id, { transaction: t });
      if (order && !["paid", "completed"].includes(order.status)) {
        await order.update({ status: "paid" }, { transaction: t });
      }
    });
  }
  return payment;
};

const capturePaypalOrder = async (paypalOrderId) => {
  if (!paypalOrderId) {
    throw new PaypalServiceError("Thieu paypalOrderId", 400, "PAYPAL_TOKEN_MISSING");
  }
  const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
  request.requestBody({});
  const client = getPaypalClient();
  try {
    const response = await client.execute(request);
    if (response?.result?.status === "COMPLETED") {
      await markPaymentAsSuccess(paypalOrderId, response.result);
      return { ok: true, data: response.result };
    }
    return { ok: false, data: response.result };
  } catch (error) {
    throw new PaypalServiceError(error.message || "Khong capture duoc don hang PayPal", 500, "PAYPAL_CAPTURE_FAILED", {
      paypalOrderId
    });
  }
};

const verifyPaypalWebhook = async (req) => {
  const cfg = ensurePaypalConfig();
  if (!cfg.webhookId) {
    throw new PaypalServiceError("Thieu PAYPAL_WEBHOOK_ID de xac thuc webhook", 500, "PAYPAL_WEBHOOK_ID_MISSING");
  }

  const authAlgo = req.headers["paypal-auth-algo"];
  const certUrl = req.headers["paypal-cert-url"];
  const transmissionId = req.headers["paypal-transmission-id"];
  const transmissionSig = req.headers["paypal-transmission-sig"];
  const transmissionTime = req.headers["paypal-transmission-time"];

  const webhookEvent = req.body;
  const verifyRequest = {
    authAlgo,
    certUrl,
    transmissionId,
    transmissionSig,
    transmissionTime,
    webhookId: cfg.webhookId,
    webhookEvent
  };

  const response = await paypal.notification.webhookEvent.verify(getPaypalClient(), verifyRequest);
  return response && response.verification_status === "SUCCESS";
};

const handlePaypalWebhookEvent = async (event) => {
  const eventType = event?.event_type;
  const resource = event?.resource || {};
  const paypalOrderId = resource.id || resource?.supplementary_data?.related_ids?.order_id;
  if (!paypalOrderId) {
    return;
  }
  if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
    await markPaymentAsSuccess(paypalOrderId, resource);
  }
};

export {
  PaypalServiceError,
  createPaypalOrder,
  capturePaypalOrder,
  verifyPaypalWebhook,
  handlePaypalWebhookEvent
};

