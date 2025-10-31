"use strict";

import { Op, fn, col, literal } from "sequelize";
import db from "../models/index.js";

const {
  sequelize,
  User,
  Order,
  OrderItem,
  Product,
  Promotion
} = db;

class CustomerServiceError extends Error {
  constructor(message, statusCode = 400, code = "CUSTOMER_SERVICE_ERROR", metadata = {}) {
    super(message);
    this.name = "CustomerServiceError";
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
  }
}

const toPlain = (item) => (item?.get ? item.get({ plain: true }) : item);

const ensureCustomerUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new CustomerServiceError("Khong tim thay nguoi dung", 404, "USER_NOT_FOUND");
  }
  if (!["customer", "admin"].includes(user.role)) {
    throw new CustomerServiceError("Vai tro khong duoc phep thuc hien thao tac nay", 403, "ROLE_NOT_ALLOWED");
  }
  return user;
};

const listActiveProducts = async ({ search, categoryId, limit } = {}) => {
  const where = {};
  if (categoryId) {
    where.category_id = Number(categoryId);
  }
  if (search) {
    where.name = { [Op.like]: `%${search.trim()}%` };
  }

  const options = {
    where,
    include: [{ model: db.ProductOption, as: "options" }],
    order: [["updated_at", "DESC"]]
  };

  if (limit) {
    const parsedLimit = Number(limit);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      options.limit = Math.min(parsedLimit, 50);
    }
  }

  const products = await Product.findAll(options);
  return products.map((product) => {
    const plain = product.get({ plain: true });
    return {
      ...plain,
      options: Array.isArray(plain.options) ? plain.options : []
    };
  });
};

const mapOrderPlain = (order) => {
  const plain = order.get({ plain: true });
  const items = Array.isArray(plain.OrderItems) ? plain.OrderItems : [];
  return {
    ...plain,
    items: items.map((item) => ({
      order_item_id: item.order_item_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      product: item.Product ? {
        product_id: item.Product.product_id,
        name: item.Product.name,
        price: item.Product.price,
        image_url: item.Product.image_url,
        food_type: item.Product.food_type
      } : null
    }))
  };
};

const buildOrderSummary = (ordersByStatus, totalSpentRaw) => {
  const summaryMap = ordersByStatus.reduce((acc, item) => {
    acc[item.status] = Number(item.count || 0);
    return acc;
  }, {});

  const totalOrders = ordersByStatus.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const completedOrders = summaryMap.completed || 0;
  const activeOrders = (summaryMap.pending || 0) + (summaryMap.confirmed || 0) + (summaryMap.preparing || 0) + (summaryMap.delivering || 0) + (summaryMap.shipping || 0);
  const canceledOrders = summaryMap.canceled || 0;
  const totalSpent = Number(totalSpentRaw || 0);
  const averageOrderValue = totalOrders ? Number((totalSpent / totalOrders).toFixed(0)) : 0;

  return {
    totalOrders,
    completedOrders,
    activeOrders,
    canceledOrders,
    totalSpent,
    averageOrderValue
  };
};

const getCustomerDashboard = async (userId) => {
  let profile = null;
  let ordersByStatus = [];
  let totalSpent = 0;
  let recentOrders = [];

  if (userId) {
    const user = await ensureCustomerUser(userId);
    profile = toPlain(user);

    [ordersByStatus, totalSpent, recentOrders] = await Promise.all([
      Order.findAll({
        where: { user_id: userId },
        attributes: ["status", [fn("COUNT", col("status")), "count"]],
        group: ["status"],
        raw: true
      }),
      Order.sum("total_amount", {
        where: {
          user_id: userId,
          status: { [Op.notIn]: ["canceled", "refunded"] }
        }
      }),
      Order.findAll({
        where: { user_id: userId },
        include: [
          {
            model: OrderItem,
            include: [{ model: Product, attributes: ["product_id", "name", "price", "image_url", "food_type"] }]
          }
        ],
        order: [["created_at", "DESC"]],
        limit: 5
      })
    ]);

    recentOrders = recentOrders.map(mapOrderPlain);
  }

  const now = new Date();

  const [activePromotions, topProducts] = await Promise.all([
    Promotion.findAll({
      where: {
        is_active: true,
        start_date: { [Op.lte]: now },
        end_date: { [Op.gte]: now },
        [Op.or]: [
          { applicable_roles: null },
          literal("JSON_CONTAINS(COALESCE(applicable_roles, '[]'), '\"customer\"')")
        ]
      },
      order: [["end_date", "ASC"]],
      limit: 5
    }),
    OrderItem.findAll({
      attributes: [
        "product_id",
        [fn("SUM", col("quantity")), "totalSold"],
        [fn("SUM", col("price * quantity")), "revenue"]
      ],
      include: [
        {
          model: Product,
          attributes: ["product_id", "name", "price", "image_url", "food_type"]
        }
      ],
      group: ["product_id", "Product.product_id"],
      order: [[literal("totalSold"), "DESC"]],
      limit: 6
    })
  ]);

  const formattedTopProducts = topProducts.map((item) => ({
    product_id: item.product_id,
    totalSold: Number(item.get("totalSold") || 0),
    revenue: Number(item.get("revenue") || 0),
    product: item.Product ? {
      product_id: item.Product.product_id,
      name: item.Product.name,
      price: item.Product.price,
      image_url: item.Product.image_url,
      food_type: item.Product.food_type
    } : null
  }));

  return {
    profile,
    orderSummary: buildOrderSummary(ordersByStatus, totalSpent),
    recentOrders,
    activePromotions: activePromotions.map(toPlain),
    recommendations: formattedTopProducts
  };
};

const listOrdersForCustomer = async (userId, { status } = {}) => {
  await ensureCustomerUser(userId);
  const where = { user_id: userId };
  if (status && status !== "all") {
    where.status = status;
  }

  const orders = await Order.findAll({
    where,
    include: [
      {
        model: OrderItem,
        include: [{ model: Product, attributes: ["product_id", "name", "price", "image_url", "food_type"] }]
      }
    ],
    order: [["created_at", "DESC"]]
  });

  return orders.map(mapOrderPlain);
};

const getCustomerOrder = async (userId, orderId) => {
  await ensureCustomerUser(userId);
  const order = await Order.findOne({
    where: { order_id: orderId, user_id: userId },
    include: [
      {
        model: OrderItem,
        include: [{ model: Product, attributes: ["product_id", "name", "price", "image_url", "food_type"] }]
      }
    ]
  });
  if (!order) {
    throw new CustomerServiceError("Khong tim thay don hang", 404, "ORDER_NOT_FOUND");
  }
  return mapOrderPlain(order);
};

const createOrderForCustomer = async (userId, payload = {}) => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    throw new CustomerServiceError("Don hang phai co it nhat mot san pham", 422, "ORDER_ITEMS_REQUIRED");
  }

  const sanitizedItems = items.map((item, index) => {
    const productId = Number(item.productId ?? item.product_id);
    const quantity = Number(item.quantity);
    if (!productId || Number.isNaN(productId)) {
      throw new CustomerServiceError(`Ma san pham khong hop le tai vi tri ${index + 1}`, 422, "PRODUCT_INVALID");
    }
    if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
      throw new CustomerServiceError(`So luong phai lon hon 0 tai vi tri ${index + 1}`, 422, "QUANTITY_INVALID");
    }
    return { productId, quantity };
  });

  const productIds = [...new Set(sanitizedItems.map((item) => item.productId))];
  const products = await Product.findAll({ where: { product_id: productIds, is_active: true } });

  if (products.length !== productIds.length) {
    const missing = productIds.filter((id) => !products.some((product) => product.product_id === id));
    throw new CustomerServiceError("Mot so san pham khong ton tai hoac da ngung ban", 404, "PRODUCT_NOT_FOUND", { missing });
  }

  const productMap = products.reduce((acc, product) => {
    acc[product.product_id] = product;
    return acc;
  }, {});

  const orderItemsPayload = sanitizedItems.map((item) => {
    const product = productMap[item.productId];
    return {
      product_id: product.product_id,
      quantity: item.quantity,
      price: Number(product.price)
    };
  });

  const totalAmount = orderItemsPayload.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  return sequelize.transaction(async (transaction) => {
    const order = await Order.create(
      {
        user_id: userId,
        total_amount: totalAmount,
        status: "pending",
        note: payload.note ? String(payload.note).trim() : null,
        expected_delivery_time: payload.expectedDeliveryTime ? new Date(payload.expectedDeliveryTime) : null
      },
      { transaction }
    );

    await OrderItem.bulkCreate(
      orderItemsPayload.map((item) => ({
        ...item,
        order_id: order.order_id
      })),
      { transaction }
    );

    const created = await Order.findByPk(order.order_id, {
      include: [
        {
          model: OrderItem,
          include: [{ model: Product, attributes: ["product_id", "name", "price", "image_url", "food_type"] }]
        }
      ],
      transaction
    });

    return mapOrderPlain(created);
  });
};

const cancelCustomerOrder = async (userId, orderId) => {
  await ensureCustomerUser(userId);
  const order = await Order.findOne({ where: { order_id: orderId, user_id: userId } });
  if (!order) {
    throw new CustomerServiceError("Khong tim thay don hang", 404, "ORDER_NOT_FOUND");
  }

  if (["completed", "canceled", "refunded"].includes(order.status)) {
    throw new CustomerServiceError("Don hang khong the huy o trang thai hien tai", 409, "ORDER_NOT_CANCELABLE", {
      status: order.status
    });
  }

  order.status = "canceled";
  await order.save();

  return mapOrderPlain(order);
};

const getProfile = async (userId) => {
  const user = await ensureCustomerUser(userId);
  return toPlain(user);
};

const updateProfile = async (userId, payload = {}) => {
  const user = await ensureCustomerUser(userId);
  const allowedFields = ["full_name", "phone_number", "address", "gender"];
  const updates = {};

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updates[field] = payload[field];
    }
  });

  if (!Object.keys(updates).length) {
    throw new CustomerServiceError("Khong co truong nao duoc cap nhat", 422, "NO_UPDATES");
  }

  await user.update(updates);
  return toPlain(user);
};

export {
  CustomerServiceError,
  listActiveProducts,
  getCustomerDashboard,
  listOrdersForCustomer,
  getCustomerOrder,
  createOrderForCustomer,
  cancelCustomerOrder,
  getProfile,
  updateProfile
};
