"use strict";

import Stripe from "stripe";
import db from "../../models/index.js";

const { Order, Payment, sequelize } = db;

class StripeServiceError extends Error {
  constructor(message, statusCode = 400, code = "STRIPE_ERROR", metadata = {}) {
    super(message);
    this.name = "StripeServiceError";
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
  }
}

const ensureStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new StripeServiceError("Thieu cau hinh STRIPE_SECRET_KEY", 500, "STRIPE_CONFIG_MISSING");
  }
  return new Stripe(secretKey, { apiVersion: "2023-10-16" });
};

let cachedStripe = null;

const getStripe = () => {
  if (!cachedStripe) {
    cachedStripe = ensureStripeClient();
  }
  return cachedStripe;
};

const getStripeCurrency = () => (process.env.STRIPE_CURRENCY || "vnd").toLowerCase();

const toStripeAmount = (value) => {
  const currency = getStripeCurrency();
  const numeric = Number(value || 0);
  if (["jpy", "vnd", "krw"].includes(currency)) {
    return Math.round(numeric);
  }
  return Math.round(numeric * 100);
};

const createStripePaymentIntent = async (orderId) => {
  const stripe = getStripe();
  const order = await Order.findByPk(orderId);
  if (!order) {
    throw new StripeServiceError("Khong tim thay don hang", 404, "ORDER_NOT_FOUND", { orderId });
  }

  if (["canceled", "refunded"].includes(order.status)) {
    throw new StripeServiceError("Don hang khong hop le de thanh toan", 400, "ORDER_INVALID_STATUS", { status: order.status });
  }

  const amount = toStripeAmount(order.total_amount);
  const currency = getStripeCurrency();

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    metadata: {
      order_id: String(orderId)
    },
    automatic_payment_methods: { enabled: true }
  });

  await Payment.create({
    order_id: orderId,
    provider: "stripe",
    amount: Number(order.total_amount || 0),
    currency: currency.toUpperCase(),
    txn_ref: paymentIntent.id,
    status: "initiated",
    meta: {
      stripe_pi: paymentIntent.id
    }
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: Number(order.total_amount || 0),
    currency: currency.toUpperCase()
  };
};

const handleStripePaymentSuccess = async (paymentIntentId, payload = {}) => {
  const payment = await Payment.findOne({ where: { txn_ref: paymentIntentId } });
  if (!payment) return;

  await payment.update({
    status: "success",
    meta: {
      ...(payment.meta || {}),
      stripe_event: payload
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
};

const handleStripeWebhook = async (signature, rawBody) => {
  const stripe = getStripe();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    throw new StripeServiceError("Thieu STRIPE_WEBHOOK_SECRET", 500, "STRIPE_WEBHOOK_SECRET_MISSING");
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (error) {
    throw new StripeServiceError(error.message || "Stripe webhook signature invalid", 400, "STRIPE_WEBHOOK_INVALID");
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    await handleStripePaymentSuccess(paymentIntent.id, event);
  }
  return event;
};

export { StripeServiceError, createStripePaymentIntent, handleStripeWebhook };

