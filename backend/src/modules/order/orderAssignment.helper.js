"use strict";

import { Op } from "sequelize";
import db from "../../models/index.js";

const { StaffShift } = db;

const formatIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);
const formatIsoTime = (date = new Date()) => date.toTimeString().slice(0, 8);

const findOnDutyStaffShift = async (options = {}) => {
  const now = new Date();
  const where = {
    shift_date: formatIsoDate(now),
    status: "scheduled",
    start_time: { [Op.lte]: formatIsoTime(now) },
    end_time: { [Op.gte]: formatIsoTime(now) }
  };
  const shift = await StaffShift.findOne({
    where,
    order: [["start_time", "ASC"]],
    transaction: options.transaction
  });
  return shift;
};

const assignOrderToOnDutyStaff = async (order, options = {}) => {
  if (!order || order.assigned_staff_id) return null;
  const shift = await findOnDutyStaffShift(options);
  if (!shift) return null;
  order.assigned_staff_id = shift.staff_id;
  await order.save({ transaction: options.transaction });
  return shift.staff_id;
};

export { assignOrderToOnDutyStaff, findOnDutyStaffShift };
