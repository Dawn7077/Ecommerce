const Order = require('../../models/orderSchema.js');
const Product = require('../../models/productSchema.js'); 
const Wallet = require('../../models/walletSchema.js')

const loadOrderPage = async(req,res)=>{
    try {
        const orderId = req.params.id
        const userId =req.session.user._id
        const orders = await Order.find({userId})
        .populate('orderedItems.product')
        .sort({ createdAt: -1 });
        // .populate('address')
        console.log(orders,orderId)
        res.render('user/orders',{
            orders,
            user:req.session.user
        })
    } catch (error) {
         
    }
}

 

//  all user orders
const getUserOrders = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const page = req.query.page || 1 
        const limit = 5

        
        const orders = await Order.find({ userId })
            .populate('orderedItems.product')
            .sort({ createdAt: -1 })
            .skip((page-1)*limit)
            .limit(limit)
        
        const totalOrders = await Order.countDocuments({userId} )
        const totalPages = Math.ceil(totalOrders/limit)
        
        res.render('user/orders', {
            orders,
            user: req.session.user,
            currentPage: Number(page),
            totalPages

        });
        
    } catch (error) {
        console.log('Get orders error:', error);
        res.redirect('/');
    }
};
const getOrderDetails = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const orderId = req.params.id;
        
        const order = await Order.findOne({ _id: orderId, userId })
            .populate('orderedItems.product');
        
        if (!order) {
            return res.status(404).send('Order not found');
        }
        order.orderedItems.forEach(item=>{
            console.log('===status=',item.status,'\n===previous status[-1]=',item.statusHistory[item.statusHistory.length-2])
        })
        // const currentStatus = order.orderedItems.status
        // const previousStatus = 

        
        res.render('user/order-details', {
            order,
            user: req.session.user
        });
        
    } catch (error) {
        console.log('Get order details error:', error);
        res.redirect('/orders');
    }
};

const cancelOrder = async (req,res)=>{
    try {
        const userId = req.session.user._id
        const orderId = req.params.id;
        const {itemId , reason}  = req.body
        console.log('cancel request:',orderId)

        let refundAmount = 0

        const order = await Order.findOne({_id:orderId, userId})

        if(!order){
            return res.status(404).json({ success: false, message: 'Order not found' })
        }
        if (order.status === 'Cancelled') {
            return res.status(400).json({ 
                success: false, 
                message: 'Order is already cancelled' 
            });
        }

        if(itemId){ // for single item cancel
            const item = order.orderedItems.id(itemId)
            console.log(item)

            if(!item){
                return res.status(404).json({ success: false, message: 'Item not found' });
            }
            if(!['Pending','Processing',].includes(item.status)){
                 return res.status(400).json({ 
                    success: false, 
                    message: 'Item cannot be cancelled at this stage' 
                });
            }

            if (item.refunded || item.restocked) {
                return res.status(400).json({
                    success: false,
                    message: 'Refund already processed for this item'
                });
            }



            item.status = 'Cancelled'
            item.cancellationReason = reason
            item.statusHistory.push({
                status: 'Cancelled',
                date: new Date(),
                note: reason
            })

            //restocking
            const product = await Product.findById(item.product)
            if(product){
                const variant = product.variants.find(v=>
                    v.color === item.variant.color &&
                    v.size === item.variant.size
                )

                if(variant){
                    variant.stock += item.quantity 
                    item.restocked = true;
                }

                const total = product.variants.reduce((sum,v)=> sum + v.stock, 0)
                product.status = total > 0 ? "Available" : 'out of stock'

                await product.save()
            }

             //wallet refund
            if(order.paymentMethod === 'Wallet' || order.paymentMethod === 'Stripe'){
                 
                refundAmount = getItemPaidAmount(order, item)

                await refundToWallet(
                    order.userId,
                    refundAmount,
                    `Refunded on cancelling item:${item.productName} (Order #${order.orderId})`
                )
                item.refunded = true
            } 
                //refund

            //if all items cancelled 
            const allCancelled = order.orderedItems.every(i=> i.status === 'Cancelled')
            if(allCancelled){
                if (order.status !== 'Cancelled') {
                    order.orderStatusHistory.push({  // order status history update
                        status:'Cancelled',
                        date:new Date()
                    })
                }
               order.status ='Cancelled'
            }



        } else{

            if(!['Pending','Processing'].includes(order.status)){
                return res.status(400).json({ 
                    success: false, 
                    message: 'Order cannot be cancelled at this stage' 
                });
            }

            order.status = 'Cancelled'
            //for each items on the order list
            for(const item of order.orderedItems){
                item.status = 'Cancelled';
                item.cancellationReason = reason;
                item.statusHistory.push({
                    status: 'Cancelled',
                    date: new Date(),
                    note: reason
                });

                const product = await Product.findById(item.product);
                if (product) {
                    const variant = product.variants.find(v=>
                        v.color === item.variant.color &&
                        v.size === item.variant.size
                    )

                    if(!item.restocked && variant) {
                        variant.stock += item.quantity
                        item.restocked = true
                    }

                    if (!item.refunded && (order.paymentMethod === 'Wallet' || order.paymentMethod === 'Stripe')) {
                        item.refunded = true
                    }
                    
                    const total = product.variants.reduce((sum,v)=> sum + v.stock, 0)
                    product.status = total > 0 ? "Available" : 'out of stock' 

                    await product.save();

                } 
                
                
            
            }
        }
            // refundAmount = order.finalAmount
        //wallet refund
            if((order.paymentMethod === 'Wallet' || order.paymentMethod === 'Stripe') && !itemId){ 
                            
                    const refundableItems = order.orderedItems.filter(i => !i.refunded); 
                    const itemsTotal = order.orderedItems.reduce(
                        (sum, i) => sum + (i.price * i.quantity), // total price 
                        0
                    );

                    let refundAmount = 0;

                    for (const item of refundableItems) {
                        const itemTotal = item.price * item.quantity; //per item total 

                        const itemPaidAmount =
                            Math.round((itemTotal / itemsTotal) * order.finalAmount);

                        refundAmount += itemPaidAmount;
                        item.refunded = true;
                    }

                    if (refundAmount > 0) {
                        await refundToWallet(
                            order.userId,
                            refundAmount,
                            `Refunded remaining items on cancellation (Order #${order.orderId})`
                        );
                    }
            } 
        //refund
        order.orderStatusHistory.push({
                status: 'Cancelled',
                date: new Date()
            });
        
        await order.save()

        res.json({
            success:true,
            message:'Cancellation successful' 
        })


    } catch (error) {
        console.log('Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

const getItemPaidAmount = (order, item) => {
    const itemsTotal = order.orderedItems.reduce(
        (sum, i) => sum + (i.price * i.quantity), 0 
    );

    const itemTotal = item.price * item.quantity;

    return Math.round((itemTotal / itemsTotal) * order.finalAmount);
};



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
        wallet.balance += amount

        wallet.transactions.push({
            date:new Date(),
            type:'credit',
            amount,
            reason,
        })

        await wallet.save()

        console.log(`Refunded ₹${amount} to user ${userId} wallet on cancel order`)
        return true
    } catch (error) {
        console.error('Error refunding to wallet:',error)
        return false
    }
}



const requestReturn = async (req,res)=>{
    try {
        const userId = req.session.user._id
        const orderId = req.params.id
        const { itemId, reason } = req.body

        const order = await Order.findOne({_id:orderId,userId})

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' })
        }

        const item = order.orderedItems.id(itemId)
        if(!item){
             return res.status(404).json({ success: false, message: 'Item not found' })
        }

        if(item.status !== "Delivered"){
            return res.status(400).json({
                success:false,
                message:'Only delivered items can be returned'
            })
        }
        //checking for how many days since dlivery
        const deliveryDate = item.statusHistory.find(h=> h.status === 'Delivered')?.date
        if(deliveryDate){
            const daysAfterDelivery = Math.floor((Date.now()-deliveryDate)/(1000 * 60 * 60 * 24))
            if(daysAfterDelivery > 7){
                return res.status(400).json({ 
                    success: false, 
                    message: 'Return window has expired (7 days from delivery)' 
                });
            }
        }

        item.status = 'Return Requested'
        item.returnReason = reason
        item.returnRequestDate = new Date()
        item.statusHistory.push({
            status:'Return Requested',
            date:new Date(),
            note:reason
        })
        
        await order.save()

        res.json({
            success:true,
            message: 'Return request submitted successfully. We will review it soon.' 
        })

    } catch (error) {
        console.log('Request return error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}
const PDFDocument = require('pdfkit');

const generateOrderInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId)
            .populate("userId")
            .populate("orderedItems.product");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Prepare filename
        const fileName = `invoice_${order.orderId}.pdf`;

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });

        // Set headers for download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

        doc.pipe(res);

        // Title
        doc.fontSize(20).text("Order Invoice", { align: "center" });
        doc.moveDown();

        // Order Info
        doc.fontSize(12).text(`Invoice Date: ${new Date().toLocaleString()}`);
        doc.text(`Order ID: ${order.orderId}`);
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.text(`Order Status: ${order.status}`);

        doc.moveDown();

        // Customer Info
        doc.fontSize(14).text("Customer Information", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12).text(`Name: ${order.userId?.name}`);
        doc.text(`Email: ${order.userId?.email}`);

        doc.moveDown();

        // Shipping Address
        doc.fontSize(14).text("Shipping Address", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12).text(
            `${order.address.name}, ${order.address.landMark}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}`
        );
        doc.text(`Phone: ${order.address.phone}`);
        if (order.address.altPhone) {
            doc.text(`Alternate Phone: ${order.address.altPhone}`);
        }

        doc.moveDown();
 
        doc.fontSize(14).text("Ordered Items", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12).text("Product              Qty      Price      Total");
        doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
        doc.moveDown();
 
        order.orderedItems.forEach(item => {
            const total = item.price * item.quantity;

            doc.text(
                `${item.product.productName.substring(0, 20).padEnd(20)}  ${item.quantity}         $${item.price}        $${total}`
            );
        });

        doc.moveDown();
 
        doc.fontSize(14).text("Summary", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12).text(`Total Price: $${order.totalPrice}`);
        if (order.couponApplied) {
            doc.text(`Coupon Discount: $${order.couponDiscount}`);
        }
        doc.text(`Final Amount: $${order.finalAmount}`);

        doc.end();

    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.status(500).send("Error generating invoice PDF");
    }
};


module.exports = {
    loadOrderPage,
    getUserOrders,
    getOrderDetails,
    cancelOrder,
    requestReturn,
    generateOrderInvoice,
}