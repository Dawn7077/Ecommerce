const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Wallet = require('../../models/walletSchema')
const Coupon = require('../../models/couponSchema')

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
const changeOrderStatus1 = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        const order = await Order.findById(orderId);
        console.log('=========>',order)
        if (!order) {
            return res.status(404).json({ status: false, message: 'Order not found' });
        }


 
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            let refundAmount = 0;

            for (const item of order.orderedItems) {
                if (item.status === 'Cancelled') continue; //skip item

                if(!item.restocked){
                    const product = await Product.findById(item.product)
                    if(!product)continue
    
                    const variant = product.variants.find(v=>
                        v.color === item.variant.color &&
                        v.size === item.variant.size
                    )
    
                    if(variant){
                        variant.stock += item.quantity
                        item.restocked = true;
                    }
    
                    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                    product.status = totalStock > 0 ? "Available" : "out of stock";
    
                    await product.save();  
                }

            }

            if(!item.refunded && (order.paymentMethod === 'Wallet' || order.paymentMethod === 'Stripe')){
                await refundToWallet(order.userId, order.finalAmount, `Refund for cancelled order #${order.orderId}`)
                item.refunded = true;
            }

            console.log(`Variant stock restored for Cancelled Order ${orderId}`);
        }

        const activeStatuses = ['Pending', 'Processing', 'Shipped'];
        
        for (const item of order.orderedItems) {
            if (!activeStatuses.includes(item.status)) continue; //skip if cancelled or return 

                item.status =status
                item.statusHistory.push({
                    status,
                    note:`Status updated by admin to ${status}`,
                    date:new Date()
                })
            }

        if(order.status!== status){
            order.orderStatusHistory.push({
                status,
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

const changeOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ status: false, message: 'Order not found' });
        }

        const terminalStatuses = ['Cancelled', 'Returned'];

        // Handle order cancellation
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            let refundAmount = 0;

            for (const item of order.orderedItems) {
                if (item.status === 'Cancelled') continue; // skip already cancelled items

                // Restock variant if not restocked yet
                if (!item.restocked) {
                    const product = await Product.findById(item.product);
                    if (product) {
                        const variant = product.variants.find(v =>
                            v.color === item.variant.color && v.size === item.variant.size
                        );
                        if (variant) {
                            variant.stock += item.quantity;
                            item.restocked = true;
                        }

                        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                        product.status = totalStock > 0 ? "Available" : "out of stock";

                        await product.save();
                    }
                }

                // Refund only if not refunded and payment via wallet/stripe
                if (!item.refunded && (order.paymentMethod === 'Wallet' || order.paymentMethod === 'Stripe')) {
                    refundAmount += getItemPaidAmount(order, item);
                    item.refunded = true;
                }

                // Mark item as cancelled
                item.status = 'Cancelled';
                item.statusHistory.push({
                    status: 'Cancelled',
                    note: 'Cancelled by admin',
                    date: new Date()
                });
            }

            // Process refund for the cancelled items
            if (refundAmount > 0) {
                await refundToWallet(order.userId, refundAmount, `Refund for cancelled order #${order.orderId}`);
            }
        }

        // Update item statuses (skip cancelled/returned items)
        const activeStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered'];
        for (const item of order.orderedItems) {
            if (terminalStatuses.includes(item.status)) continue;

            item.status = status;
            item.statusHistory.push({
                status,
                note: `Status updated by admin to ${status}`,
                date: new Date()
            });
        }

        // Update order status based on items
        if (order.orderedItems.every(i => i.status === 'Cancelled')) {
            order.status = 'Cancelled';
        } else if (order.orderedItems.every(i => i.status === 'Returned')) {
            order.status = 'Returned';
        } else if (order.orderedItems.every(i => i.status === 'Delivered')) {
            order.status = 'Delivered';
        } else {
            order.status = status;
        }

        // Record in order status history if different
        if (!order.orderStatusHistory.some(h => h.status === order.status)) {
            order.orderStatusHistory.push({
                status: order.status,
                date: new Date()
            });
        }

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

        if(order.couponApplied && order.couponId){
            const coupon = await Coupon.findById(order.couponId)

            if(coupon){
                let remainingTotal =0

                order.orderedItems.forEach(i =>{
                    if(i._id.toString() !== itemId && !['Cancelled','Returned'].includes(i.status)){
                        remainingTotal += i.price * i.quantity
                    }
                })
                if(remainingTotal < coupon.minimumPrice){
                    return res.json({
                        success: false,
                        message: `Coupon applied. Refund not allowed because remaining total ₹${remainingTotal} is below coupon minimum ₹${coupon.minimumPrice}`
                    });
                }
            }
        }

        const item = order.orderedItems.id(itemId)
        
        if (!item) return res.json({ success: false, message: "Item not found" });

        if(item.status!== 'Return Requested'){
             return res.json({ success: false, message: "Item is not in return-requested status" });
        }

        
        if(!item.restocked){
            const product = await Product.findById(item.product)
            if(product){
    
                const variant = product.variants.find(v=>
                    v.color === item.variant.color &&
                    v.size === item.variant.size
                )
                const checkCancell = item.statusHistory.some(h => h.status ==='Cancelled')
    
                if (variant) {
                    variant.stock += item.quantity;
                    item.restocked = true;
                }
    
                const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                product.status = totalStock > 0 ? "Available" : "out of stock";
    
                await product.save();
            }
        }

        
        item.status = "Returned";
        item.statusHistory.push({
            status: "Returned",
            note: "Return approved by admin",
            date: new Date()
        })

        if((order.paymentMethod === 'Wallet' || order.paymentMethod === 'Stripe')&& !item.refunded){
            
            const totalItemsAmount = order.orderedItems.reduce((sum,i)=> sum + i.price * i.quantity ,0)
            const itemCouponDis = (item.price * item.quantity / totalItemsAmount) * (order.couponDiscount||0)

            // const refundAmount = (item.price * item.quantity) - itemCouponDis 
            const refundAmount = getItemPaidAmount(order, item);
            await refundToWallet(
                order.userId,
                refundAmount,
                `Refund for returned item: ${item.productName} (Order #${order.orderId})`
            )
            item.refunded = true
        }
   
        const allReturned = order.orderedItems.every(i=>["Cancelled", "Returned"].includes(i.status))
        
        if(allReturned)order.status = "Returned";

        await order.save()

        res.json({ success: true, message: "Return approved and refunded to wallet" });


    } catch (error) {
        console.error("Approve return error:", error);
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

async function refundToWallet(userId, amount, reason) {
    try {
        let wallet = await Wallet.findOne({userId})

        if(!wallet){
            wallet = new Wallet({
                userId,
                balance:0,
                transactions:[]
            })
        }

        // wallet.balance += amount
        
        const roundedAmount = parseFloat(amount.toFixed(2));
        
        wallet.balance = parseFloat((wallet.balance + roundedAmount).toFixed(2));

        wallet.transactions.push({
            date:new Date(),
            type:'credit',
            amount,
            reason,
        })

        await wallet.save()

        console.log(`Refunded ₹${amount} to user ${userId} wallet`)
        return true


    } catch (error) {
        console.error('Error refunding to wallet:',error)
        return false
    }
}

const getItemPaidAmount = (order, item) => {
    const itemsTotal = order.orderedItems.reduce(
        (sum, i) => sum + (i.price * i.quantity), 0 
    );

    const itemTotal = item.price * item.quantity;
    const itemShare = (itemTotal / itemsTotal) * order.finalAmount;

    return parseFloat(itemShare.toFixed(2));
};




module.exports = {
    getOrderList,
    getOrderDetails,
    changeOrderStatus,
    approveReturn,
    rejectReturn
};