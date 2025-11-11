"use strict";

import db from "../../models/index.js";

const { Order, Payment, sequelize } = db;

class VietQrError extends Error {
  constructor(message, statusCode = 400, code = "VIETQR_ERROR", metadata = {}) {
    super(message);
    this.name = "VietQrError";
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
  }
}

const ensureVietQrEnv = () => {
  const cfg = {
    bank: process.env.VIETQR_BANK,
    accountNo: process.env.VIETQR_ACCOUNT_NO,
    accountName: process.env.VIETQR_ACCOUNT_NAME || ""
  };
  if (!cfg.bank || !cfg.accountNo) {
    throw new VietQrError("Thieu cau hinh VietQR (VIETQR_BANK, VIETQR_ACCOUNT_NO)", 500, "VIETQR_CONFIG_MISSING");
  }
  return cfg;
};

const buildVietQrImageUrl = ({ bank, accountNo, accountName, amount, addInfo }) => {
  const base = `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(accountNo)}-qr_only.png`;
  const params = new URLSearchParams();
  if (amount) params.set("amount", String(Math.round(Number(amount || 0))));
  if (addInfo) params.set("addInfo", addInfo);
  if (accountName) params.set("accountName", accountName);
  return `${base}?${params.toString()}`;
};

const createVietqrPayment = async (orderId) => {
  const { bank, accountNo, accountName } = ensureVietQrEnv();

  const order = await Order.findByPk(orderId);
  if (!order) throw new VietQrError("Khong tim thay don hang", 404, "ORDER_NOT_FOUND", { orderId });

  const addInfo = `FATFOOD-${orderId}`;
  const amount = Number(order.total_amount || 0);
  const qrImageUrl = buildVietQrImageUrl({ bank, accountNo, accountName, amount, addInfo });

  const payment = await Payment.create({
    order_id: orderId,
    provider: "vietqr",
    amount,
    currency: "VND",
    status: "initiated",
    meta: {
      bank,
      account_no: accountNo,
      account_name: accountName,
      addInfo,
      qrImageUrl
    }
  });

  return { payment_id: payment.payment_id, order_id: orderId, amount, addInfo, qrImageUrl };
};

const confirmVietqrPayment = async (userId, orderId) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new VietQrError("Khong tim thay don hang", 404, "ORDER_NOT_FOUND", { orderId });
  if (order.user_id !== userId) {
    throw new VietQrError("Ban khong du quyen xac nhan don hang nay", 403, "FORBIDDEN");
  }
  const latest = await Payment.findOne({ where: { order_id: orderId, provider: "vietqr" }, order: [["created_at", "DESC"]] });
  if (!latest) throw new VietQrError("Khong tim thay giao dich VietQR", 404, "PAYMENT_NOT_FOUND");
  const meta = { ...(latest.meta || {}), user_confirmed: true, user_confirmed_at: new Date().toISOString() };
  await latest.update({ meta });
  return latest.get({ plain: true });
};

export { VietQrError, createVietqrPayment, confirmVietqrPayment };

