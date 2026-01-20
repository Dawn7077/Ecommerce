import User from '../../models/userSchema.js'
import Order from '../../models/orderSchema.js'
import Product from '../../models/productSchema.js'

const findAdminByEmail = async (email) => {
    return await User.findOne({ email, isAdmin: true })
}
const getTotalUsersCount = async () => {
    return await User.countDocuments()
}

const getTotalProductsCount = async () => {
    return await Product.countDocuments()
}
 
const getTotalOrdersCount = async () => {
    return await Order.countDocuments()
}

const calculateTotalRevenue = async (dateFilter) => {
    const revenueData = await Order.aggregate([
        {
            $match: {
                createdAt: dateFilter, 
                paymentStatus: { $in: ['Paid', 'Completed'] }
            }
        },
        { $unwind: "$orderedItems" },
        {
            $match: {
                "orderedItems.status": "Delivered"
            }
        },
        {
            $addFields: {
                itemTotal: {
                    $multiply: ["$orderedItems.price", "$orderedItems.quantity"]
                }
            }
        }, 
        {
            $addFields: {
                itemProportion: {
                    $cond: [
                        { $gt: ["$subtotal", 0] },
                        { $divide: ["$itemTotal", "$subtotal"] },
                        0
                    ]
                }
            }
        },
        {
            $addFields: {
                itemDiscount: {
                    $multiply: [
                        { $ifNull: ["$discount", 0] },
                        "$itemProportion"
                    ]
                },
                itemCouponDiscount: {
                    $cond: [
                        "$couponApplied",
                        {
                            $multiply: [
                                { $ifNull: ["$couponDiscount", 0] },
                                "$itemProportion"
                            ]
                        },
                        0
                    ]
                }
            }
        },
        {
            $addFields: {
                itemRevenue: {
                    $subtract: [
                        "$itemTotal",
                        { $add: ["$itemDiscount", "$itemCouponDiscount"] }
                    ]
                }
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$itemRevenue" }
            }
        }
    ])

    return revenueData.length > 0 ? revenueData[0].totalRevenue : 0
}

const getOrdersByDateFilter = async (dateFilter) => {
    return await Order.find({ createdAt: dateFilter })
}

const getTopProducts = async (dateFilter, limit = 10) => {
    return await Order.aggregate([
        { $match: { createdAt: dateFilter } },
        { $unwind: "$orderedItems" },
        {
            $match: {
                "orderedItems.status": "Delivered"
            }
        },
        {
            $group: {
                _id: "$orderedItems.product",
                totalSold: { $sum: "$orderedItems.quantity" }
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" }
    ])
}
 
const getTopCategories = async (dateFilter, limit = 10) => {
    return await Order.aggregate([
        { $match: { createdAt: dateFilter } },
        { $unwind: "$orderedItems" },
        {
            $match: {
                "orderedItems.status": "Delivered"
            }
        },
        {
            $group: {
                _id: "$orderedItems.category",
                totalSold: { $sum: "$orderedItems.quantity" }
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "category"
            }
        },
        { $unwind: "$category" }
    ])
} 

const getTopBrands = async (dateFilter, limit = 10) => {
    return await Order.aggregate([
        { $match: { createdAt: dateFilter } },
        { $unwind: "$orderedItems" },
        {
            $match: {
                "orderedItems.status": "Delivered"
            }
        },
        {
            $group: {
                _id: "$orderedItems.brand",
                totalSold: { $sum: "$orderedItems.quantity" }
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: limit }
    ])
}

const getSalesTimelineData = async (dateFilter, filterType) => {
    return await Order.aggregate([
        {
            $match: {
                status: 'Delivered',
                createdAt: dateFilter
            }
        },
        {
            $group: {
                _id:
                    filterType === 'daily' ? { $hour: '$createdAt' } :
                    filterType === 'monthly' ? { $dayOfMonth: '$createdAt' } : 
                    { $month: '$createdAt' },
                totalSales: { $sum: "$finalAmount" }
            }
        },
        { $sort: { "_id": 1 } }
    ])
}


export {
    findAdminByEmail,
    getTotalUsersCount,
    getTotalProductsCount,
    getTotalOrdersCount,
    calculateTotalRevenue,
    getOrdersByDateFilter,
    getTopProducts,
    getTopCategories,
    getTopBrands,
    getSalesTimelineData
}