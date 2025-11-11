"use strict";

import crypto from "crypto";
import db from "../../models/index.js";

const { Order, Payment, sequelize } = db;

class PaymentServiceError extends Error {
  constructor(message, statusCode = 400, code = "PAYMENT_SERVICE_ERROR", metadata = {}) {
    super(message);
    this.name = "PaymentServiceError";
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
  }
}

const sortObject = (obj = {}) => {
  const sorted = {};
  const keys = Object.keys(obj).map(encodeURIComponent).sort();
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
  }
  return sorted;
};

const stringifyNoEncode = (obj = {}) =>
  Object.keys(obj)
    .map((k) => `${k}=${obj[k]}`)
    .join("&");

const normalizeIpToIPv4 = (ip) => {
  if (!ip) return "127.0.0.1";
  const first = String(ip).split(",")[0].trim();
  if (first === "::1") return "127.0.0.1";
  if (first.startsWith("::ffff:")) return first.replace("::ffff:", "");
  // Very simple IPv6 detect; fallback to localhost IPv4
  if (first.includes(":")) return "127.0.0.1";
  return first;
};

const getClientIp = (req) =>
  normalizeIpToIPv4(
    req.headers["x-forwarded-for"] || req.connection?.remoteAddress || req.socket?.remoteAddress || req.connection?.socket?.remoteAddress
  );

const ensureVnpayEnv = () => {
  const config = {
    tmnCode: process.env.VNP_TMN_CODE,
    secretKey: process.env.VNP_HASH_SECRET,
    vnpUrl: process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    returnUrl: process.env.VNP_RETURN_URL,
    ipnUrl: process.env.VNP_IPN_URL || "",
    locale: process.env.VNP_LOCALE || "vn"
  };
  if (!config.tmnCode || !config.secretKey || !config.returnUrl) {
    throw new PaymentServiceError("Thieu cau hinh VNPAY (VNP_TMN_CODE, VNP_HASH_SECRET, VNP_RETURN_URL)", 500, "VNPAY_CONFIG_MISSING");
  }
  return config;
};

const formatDateTimeYMDHMS = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
};

const buildTxnRef = (orderId) => `${orderId}-${formatDateTimeYMDHMS()}`;

const createVnpayPaymentUrl = async (req, { orderId, bankCode, locale, withDebug = false }) => {
  const { tmnCode, secretKey, vnpUrl, returnUrl, ipnUrl } = ensureVnpayEnv();

  const order = await Order.findByPk(orderId);
  if (!order) throw new PaymentServiceError("Khong tim thay don hang", 404, "ORDER_NOT_FOUND", { orderId });
  if (["canceled", "refunded"].includes(order.status)) {
    throw new PaymentServiceError("Don hang khong hop le de thanh toan", 400, "ORDER_INVALID_STATUS", { status: order.status });
  }

  const txnRef = buildTxnRef(orderId);
  const amount = Number(order.total_amount);
  const ipAddr = getClientIp(req);
  const createDate = formatDateTimeYMDHMS();

  const vnpParams = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale || "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Thanh toan cho ma GD:${orderId}`,
    vnp_OrderType: "other",
    vnp_Amount: Math.round(amount * 100),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate
  };
  if (bankCode) vnpParams.vnp_BankCode = bankCode;
  // Do not send vnp_IpnUrl in pay request; configure IPN URL in VNPAY portal instead.

  const sorted = sortObject(vnpParams);
  const signData = stringifyNoEncode(sorted);
  const hmac = crypto.createHmac("sha512", secretKey);
  const vnp_SecureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
  if (process.env.VNP_DEBUG_SIGN === "1") {
    console.log("[VNPAY][CREATE] signData=", signData);
    console.log("[VNPAY][CREATE] hash=", vnp_SecureHash);
  }
  const payUrl = `${vnpUrl}?${stringifyNoEncode({ ...sorted, vnp_SecureHash })}`;

  const payment = await Payment.create({
    order_id: orderId,
    provider: "vnpay",
    amount,
    currency: "VND",
    txn_ref: txnRef,
    status: "initiated",
    meta: { created_at: new Date().toISOString() }
  });

  const response = { payUrl, txnRef };
  if (withDebug) {
    response.debug = { signData, params: sorted, payment_id: payment.payment_id };
  }
  return response;
};

const verifyVnpReturn = async (query) => {
  const { secretKey } = ensureVnpayEnv();
  const vnpParams = { ...query };
  const secureHash = vnpParams["vnp_SecureHash"];
  delete vnpParams["vnp_SecureHash"]; // keep vnp_SecureHashType if present out of sign
  delete vnpParams["vnp_SecureHashType"];

  const sorted = sortObject(vnpParams);
  const signData = stringifyNoEncode(sorted);
  const signed = crypto.createHmac("sha512", secretKey).update(Buffer.from(signData, "utf-8")).digest("hex");
  if (process.env.VNP_DEBUG_SIGN === "1") {
    console.log("[VNPAY][RETURN] signData=", signData);
    console.log("[VNPAY][RETURN] expectedHash=", signed);
    console.log("[VNPAY][RETURN] receivedHash=", secureHash);
  }

  const isValidSignature = secureHash === signed;
  const rspCode = vnpParams["vnp_ResponseCode"];
  const txnRef = vnpParams["vnp_TxnRef"];

  const payment = await Payment.findOne({ where: { txn_ref: txnRef }, include: [Order] });
  if (!payment) {
    throw new PaymentServiceError("Khong tim thay giao dich", 404, "PAYMENT_NOT_FOUND", { txnRef });
  }

  if (!isValidSignature) {
    await payment.update({ status: "failed", meta: { ...(payment.meta || {}), reason: "INVALID_SIGNATURE", vnp: vnpParams } });
    return { ok: false, code: "97", message: "Chu ky khong hop le" };
  }

  if (rspCode === "00") {
    await sequelize.transaction(async (t) => {
      await payment.update({ status: "success", meta: { ...(payment.meta || {}), vnp: vnpParams } }, { transaction: t });
      if (payment.order_id) {
        const order = await Order.findByPk(payment.order_id, { transaction: t });
        if (order && order.status !== "paid" && order.status !== "completed") {
          await order.update({ status: "paid" }, { transaction: t });
        }
      }
    });
    return { ok: true, code: rspCode, message: "Thanh toan thanh cong" };
  }

  await payment.update({ status: "failed", meta: { ...(payment.meta || {}), vnp: vnpParams } });
  return { ok: false, code: rspCode, message: "Thanh toan that bai" };
};

const handleVnpIpn = async (query) => {
  const { secretKey } = ensureVnpayEnv();
  const vnpParams = { ...query };
  const secureHash = vnpParams["vnp_SecureHash"];
  delete vnpParams["vnp_SecureHash"]; // remove from sign
  delete vnpParams["vnp_SecureHashType"];

  const sorted = sortObject(vnpParams);
  const signData = stringifyNoEncode(sorted);
  const signed = crypto.createHmac("sha512", secretKey).update(Buffer.from(signData, "utf-8")).digest("hex");
  if (process.env.VNP_DEBUG_SIGN === "1") {
    console.log("[VNPAY][IPN] signData=", signData);
    console.log("[VNPAY][IPN] expectedHash=", signed);
    console.log("[VNPAY][IPN] receivedHash=", secureHash);
  }
  const isValidSignature = secureHash === signed;

  const rspCode = vnpParams["vnp_ResponseCode"];
  const txnRef = vnpParams["vnp_TxnRef"];
  const amount = Number(vnpParams["vnp_Amount"]) / 100;

  const payment = await Payment.findOne({ where: { txn_ref: txnRef }, include: [Order] });
  if (!payment) {
    return { RspCode: "01", Message: "Order not found" };
  }

  if (!isValidSignature) {
    return { RspCode: "97", Message: "Invalid signature" };
  }

  if (Number.isFinite(amount) && payment.amount !== undefined && Number(payment.amount) !== amount) {
    return { RspCode: "04", Message: "Invalid amount" };
  }

  if (payment.status === "success") {
    return { RspCode: "02", Message: "Order already confirmed" };
  }

  if (rspCode === "00") {
    await sequelize.transaction(async (t) => {
      await payment.update({ status: "success", meta: { ...(payment.meta || {}), vnp: vnpParams } }, { transaction: t });
      if (payment.order_id) {
        const order = await Order.findByPk(payment.order_id, { transaction: t });
        if (order && order.status !== "paid" && order.status !== "completed") {
          await order.update({ status: "paid" }, { transaction: t });
        }
      }
    });
    return { RspCode: "00", Message: "Confirm Success" };
  }

  await payment.update({ status: "failed", meta: { ...(payment.meta || {}), vnp: vnpParams } });
  return { RspCode: rspCode || "99", Message: "Payment failed" };
};

export { PaymentServiceError, createVnpayPaymentUrl, verifyVnpReturn, handleVnpIpn };

