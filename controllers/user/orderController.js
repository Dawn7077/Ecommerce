const Order = require('../../models/orderSchema.js');
const Product = require('../../models/productSchema.js'); 

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

        const order = await Order.findOne({_id:orderId, userId})

        if(!order){
            return res.status(404).json({ success: false, message: 'Order not found' })
        }
        if(itemId){
            const item = order.orderedItems.id(itemId)
            if(!item){
                return res.status(404).json({ success: false, message: 'Item not found' });
            }
            if(!['Pending','Processing'].includes(item.status)){
                 return res.status(400).json({ 
                    success: false, 
                    message: 'Item cannot be cancelled at this stage' 
                });
            }
            item.status = 'Cancelled'
            item.cancellationReason = reason
            item.statusHistory.push({
                status: 'Cancelled',
                date: new Date(),
                note: reason
            })


            const product = await Product.findById(item.product)
            if(product){
                const variant = product.variants.find(v=>
                    v.color === item.variant.color &&
                    v.size === item.variant.size
                )

                if(variant){
                    variant.stock += item.quantity
                }

                const total = product.variants.reduce((sum,v)=> sum + v.stock, 0)
                product.status = total > 0 ? "Available" : 'out of stock'

                await product.save()
            }



            const allCancelled = order.orderedItems.every(i=> i.status === 'Cancelled')
            if(allCancelled){
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

                    if(variant) variant.stock += item.quantity
                    
                    const total = product.variants.reduce((sum,v)=> sum + v.stock, 0)
                    product.status = total > 0 ? "Available" : 'out of stock' 

                    await product.save();

                } 
            }
        }

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