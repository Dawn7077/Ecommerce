const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

const getOrderList = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const statusFilter = req.query.status || ""; 
        const paymentFilter =req.query.paymentStatus || ""; 
        const dateFrom = req.query.dateFrom || ''
        const dateTo = req.query.dateTo || ''
        const sortQuery = req.query.sort || ''

        
        let query = {};
        
        if (statusFilter) {
            query.status = statusFilter;
        }
        if (paymentFilter) {
            query.paymentStatus = paymentFilter;
        }
        if(dateFrom || dateTo){
            query.createdAt = {}
            if(dateFrom) query.createdAt.$gte = new Date(dateFrom)
            if(dateTo) query.createdAt.$lte = new Date(dateTo)
        }

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: "i" } }, 
            ];
        }

        let sortOption = {}
        switch(sortQuery){
            case 'newest':
                sortOption = {createdAt :-1};
                break;
            case 'oldest':
                sortOption = {createdAt :1};
                break;
            case 'highest':
                sortOption = {totalPrice :-1};
                break;
            case 'lowest':
                sortOption = {totalPrice :1};
                break;
            default:
                sortOption = {createdAt :-1};
        }


 
        const orders = await Order.find(query)
            .populate('userId', 'name email')  
            .populate('orderedItems.product') 
            .sort(sortOption) // Descending order
            .skip((page - 1) * limit)
            .limit(limit);

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('admin/order', {
            orders,
            currentPage: page,
            totalPages,
            search,
            statusFilter,
            paymentFilter,
            dateFrom,
            dateTo,
            sort:sortQuery
        });

    } catch (error) {
        console.error("Error fetching order list:", error);
        res.redirect('/admin/pageError');
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.query.id;
        const order = await Order.findById(orderId)
            .populate('userId')
            .populate('orderedItems.product');

        if (!order) {
            return res.redirect('/admin/orders');
        }

        res.render('admin/orderDetails', { order });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.redirect('/admin/pageError');
    }
};
const changeOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        const order = await Order.findById(orderId);
        console.log('=========>',order)
        if (!order) {
            return res.status(404).json({ status: false, message: 'Order not found' });
        }
 
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            for (const item of order.orderedItems) {
                await Product.updateOne(
                    { _id: item.product },
                    { $inc: { quantity: item.quantity } }
                );
            }
            console.log(`Stock restored for Order ${orderId}`);
        }
        
        for (const item of order.orderedItems) {
                item.status =status
                item.statusHistory.push({
                    status,
                    note:`Status updated by admin to ${status}`,
                    date:new Date()
                })
            }

        order.status = status;
        console.log('=========>',order.status )
        await order.save();

        res.json({ status: true, message: 'Order status updated successfully' });

    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
}; 

const approveReturn  = async (req,res)=>{
    try {
        const{orderId,itemId} = req.body

        const order = await Order.findById(orderId);
        if(!order) return res.json({ success: false, message: "Order not found" });

        const item = order.orderedItems.id(itemId)
        if (!item) return res.json({ success: false, message: "Item not found" });

        if(item.status!== 'Return Requested'){
             return res.json({ success: false, message: "Item is not in return-requested status" });
        }

        item.status = "Returned";

        await Product.updateOne(
            {_id:item.product},
            {$inc:{quantity:item.quantity}}
        )

        item.statusHistory.push({
            status: "Returned",
            note: "Return approved by admin",
            date: new Date()
        })

        const allReturned = order.orderedItems.every(i=>["Cancelled", "Returned"].includes(i.status))
        
        if(allReturned)order.status = "Returned";

        await order.save()

        res.json({ success: true, message: "Return approved successfully" });


    } catch (error) {
        console.error("Approve return error:", err);
        res.json({ success: false, message: "Internal server error" });
    }
}
const rejectReturn  = async (req,res)=>{
    try {
        const{orderId,itemId} = req.body

        const order = await Order.findById(orderId);
        if(!order) return res.json({ success: false, message: "Order not found" });

        const item = order.orderedItems.id(itemId)
        if (!item)return res.json({ success: false, message: "Item not found" });

        if(item.status!== 'Return Requested'){
             return res.json({ success: false, message: "Item is not in return-requested status" });
        }

        item.status = "Delivered";
        item.statusHistory.push({
            status: "Return Rejected",
            note: "Return rejected by admin",
            date: new Date()
        }); 

        await order.save() 
        res.json({ success: true, message: "Return rejected" });


    } catch (error) {
        console.error("Reject return error:", error);
        res.json({ success: false, message: "Internal server error" });
    }
}




module.exports = {
    getOrderList,
    getOrderDetails,
    changeOrderStatus,
    approveReturn,
    rejectReturn
};