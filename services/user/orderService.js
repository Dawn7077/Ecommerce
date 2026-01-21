import Order from "../../models/orderSchema.js";
import Product from "../../models/productSchema.js";
import Coupon from "../../models/couponSchema.js";

export const fetchOrderListService = async ({
  search = "",
  page = 1,
  limit = 10,
  statusFilter = "",
  paymentFilter = "",
  dateFrom = "",
  dateTo = "",
  sortQuery = ""
}) => {

  let query = {};

  if (statusFilter) query.status = statusFilter;
  if (paymentFilter) query.paymentStatus = paymentFilter;

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  if (search) {
    query.$or = [
      { orderId: { $regex: search, $options: "i" } }
    ];
  }

  let sortOption = {};
  switch (sortQuery) {
    case "newest":
      sortOption = { createdAt: -1 };
      break;
    case "oldest":
      sortOption = { createdAt: 1 };
      break;
    case "highest":
      sortOption = { totalPrice: -1 };
      break;
    case "lowest":
      sortOption = { totalPrice: 1 };
      break;
    default:
      sortOption = { createdAt: -1 };
  }

  const orders = await Order.find(query)
    .populate("userId", "name email")
    .populate("orderedItems.product")
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(limit);

  const totalOrders = await Order.countDocuments(query);
  const totalPages = Math.ceil(totalOrders / limit);

  return {
    orders,
    totalPages,
    totalOrders
  };
};

export const orderFindbyIdPopulate= async (orderId) => {
    return await Order.findById(orderId)
            .populate('userId')
            .populate('orderedItems.product');

} 
export const orderFindbyId= async (orderId) => {
    return await Order.findById(orderId) 

} 
export const productFindbyId= async (id) => {
    return await Product.findById(id);
} 
export const couponFindbyId= async (id) => {
    return await Coupon.findById(id);
} 
