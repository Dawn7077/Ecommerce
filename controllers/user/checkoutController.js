const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Cart = require('../../models/cartSchema')
const Coupon = require('../../models/couponSchema')
const Order = require('../../models/orderSchema')  
const Product = require('../../models/productSchema')
const Wallet = require('../../models/walletSchema')
const Stripe = require('stripe')
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

const getCheckout1 = async(req,res)=>{
    try {
        const userId = req.session.user._id
        const user = await User.findById(userId)
        let addressDoc = await Address.findOne({userId})
        if(!addressDoc){
            addressDoc = new Address({userId, address:[]})
            await addressDoc.save()
        }
        const userAddresses = addressDoc.address // array of address[]

        const todayDate = new Date()
        const coupons = await Coupon.find({isList:true,expireOn:{$gte:todayDate}})
        // console.log(todayDate,'==>',coupons)
        let grandTotal = 0

        const cart = await Cart.findOne({userId}).populate('items.productId')
        if(!cart || cart.items.length === 0){
            return res.render('user/checkout',{
                user,  
                cart: cart ? cart.items : [],
                itemCount: cart ? cart.items.length : 0,
                addresses:userAddresses,
                subtotal: "0.00",
                discount: "0.00",
                couponDiscount: "0.00",
                appliedCoupon:req.session.appliedCoupon?req.session.appliedCoupon:null,
                shipping: "0.00",
                total: "0.00", 
                grandTotal, 
                coupons:coupons,
            })
        }

        const validItems = cart.items.filter(item=>{
            const product = item.productId
            return product && !product.isBlocked && product.status === "Available";
        }) 

        

        let subtotal = 0 
        let totalDiscount = 0
        
        validItems.forEach(item=>{
            const p = item.productId
            
            const regular = p.regularPrice
            const sale = p.salesPrice
            const qty = item.quantity

            const discount = regular - sale
            subtotal += regular * qty
            totalDiscount += discount * qty

            // item.price = sale;
            // item.originalPrice = regular;
            // item.discount = discount;
            // item.totalPrice = sale * qty;
        })

        if(validItems.length !== cart.items.length){
            cart.items = validItems
            await cart.save()
        }
        const cartAmount = subtotal - totalDiscount 
        const shipping = subtotal >= 1000? 0  :50;

        let couponDiscount = 0 
        let appliedCoupon = null

        if(req.session.appliedCoupon){
            const coupon = await Coupon.findById(req.session.appliedCoupon)
            if(coupon && coupon.isList && cartAmount>= coupon.minimumPrice) {
                couponDiscount = Math.min(coupon.offerPrice , cartAmount)
                appliedCoupon = coupon
            }else{
                delete req.session.appliedCoupon
            }
        }

        const total = cartAmount - couponDiscount + shipping

        // const total = cartAmount - coupon + shipping
        // console.log(total,totalDiscount, cartAmount,coupon)


        // const product = cart.items.map(item=>({
        //     productDetails:[item.productId],
        //     quantity:item.quantity
        // }))
        
        // for(let item of cart.items){
        //     grandTotal+= item.quantity * item.productId.salesPrice
        // }



        res.render('user/checkout',{
            user, 
            addresses:userAddresses,
            cart:cart.items,    
            coupons,
            appliedCoupon,
            subtotal:subtotal.toFixed(2),
            discount:totalDiscount.toFixed(2), 
            couponDiscount:couponDiscount.toFixed(2),
            shipping,
            total:total.toFixed(2),
            itemCount:cart.items.length

        })
    } catch (error) {
        console.log("Checkout error:", error);
        res.redirect("/cart");
    }
}


const addNewAddress = async (req,res)=>{
    try {
        const userId = req.session.user._id
        const userData = await User.findById(userId)
        const{addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body
        const userAddress = await Address.findOne({userId:userData._id})
        if(!userAddress){
            const newAddress = new Address({
                userId:userData._id,
                address:[{addressType,name,city,landMark,state,pincode,phone,altPhone}]
            })
            await newAddress.save()
        }else{
            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone})
            await userAddress.save()
        }
        console.log('address added')
        return res.json({ success: true });


    } catch (error) {
        console.log("New Address Add ERROR →", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
}

const updateAddress = async (req,res)=>{
    try {
        const userId =req.session.user._id
        const addressId = req.params.id
        const {addressType,name,city,landMark,
              state,pincode,phone,altPhone} = req.body

        const userAddress = await Address.findOne({userId})

        if(!userAddress){
            return res.status(404).json({success:false,message:'Address not found'})
        }

        const addressIndex = userAddress.address.findIndex(
            add=> add._id.toString() === addressId
        )

        if(addressIndex === -1){
            return res.status(404).json({success:false,message:'Address not found'})
        }
        
        userAddress.address[addressIndex] = {
            ...userAddress.address[addressIndex]._doc,
            addressType,name,city,landMark,state,pincode,phone,altPhone
        }
        
        await userAddress.save()
        console.log("Address updated")
        return res.status(200).json({success:true})
 
    } catch (error) { 
        console.log("Edit address error:",error)
        return res.status(500).json({success:false,message:'Server Error'})
    }
}

const deleteCheckoutAddress =  async (req,res)=>{
    try {
        const userId =req.session.user._id
        const addressId = req.params.id
        const userAddress = await Address.findOne({userId})
        if(!userAddress){
            return res.status(404).json({success:false,message:'Address not found'})
        }

        userAddress.address =userAddress.address.filter(
            addr=> addr._id.toString()!== addressId
        )
        await userAddress.save()
        console.log("Address deleted")
        return res.status(200).json({success:true})

    } catch (error) {
        console.log("delete address error:",error)
        return res.status(500).json({success:false,message:'Server Error'})
        
    }
}


const applyCoupon1 = async(req,res)=>{
    try {
        const {couponCode} = req.body
        const userId = req.session.user._id

        const coupon = await Coupon.findOne({
            name:couponCode.trim().toUpperCase(),
            isList:true
        })
        if(req.session.appliedCoupon){
            return res.json({
                success: false,
                message: 'A coupon is already applied. Please remove it first.'
            })
        }


        if(!coupon){
            return res.json({success:false,message:'Invalid Coupon code'})
        }

        const now = new Date()
        if(now < coupon.createdOn || now > coupon.expireOn){
            return res.json({success:false,message:'This coupon has expired'})
        }

        const cart = await Cart.findOne({userId}).populate('items.productId')
        if(!cart || cart.items.length === 0){
            return res.json({success:false,message:'Your Cart is empty'})
        }

        let cartAmount = 0 
        cart.items.forEach(item=>{
            const product = item.productId
            if(product && !product.isBlocked && product.status === 'Available'){
                cartAmount += product.salesPrice * item.quantity
            }
        })

        if(cartAmount < coupon.minimumPrice){
            return res.json({success:false,message:`Minimum purchase of ${coupon.minimumPrice} required for this coupon`})
        }

         // Check if user already used this coupon
        // const order = await Order.findOne({
        //     userId: userId,
        //     coupon: coupon._id
        // })

        // if(order){
        //     return res.json({ 
        //         success: false, 
        //         message: 'You have already used this coupon' 
        //     })
        // }

        const discount = Math.min(coupon.offerPrice , cartAmount)

        req.session.appliedCoupon = coupon._id
        return res.json({ 
                success: true, 
                message: 'Coupon applied successfully' ,
                discount,
                couponCode:coupon.name
            })
        
    } catch (error) {
        console.log('Error in applying coupon',error)
        return res.json({ 
                success: false, 
                message: 'Error in applying coupon' 
            })
    }
}

 

const removeCoupon = async(req,res)=>{
    try {
        delete req.session.appliedCoupon

        return res.json({ 
                success: true, 
                message: 'Coupon removed successfully' , 
            })
        
    } catch (error) {
        console.log('Error in removing coupon',error)
        return res.json({ 
                success: false, 
                message: 'Error in removing coupon' 
            })
    }
}
//new placeorder
const placeorder1 = async (req,res)=>{
    try {
        const {addressId,paymentMethod} = req.body
        const userId = req.session.user._id
 
        if(!addressId ||!paymentMethod){
            return res.status(400).json({ 
                success: false, 
                message: 'Address and payment method are required' 
            });
        }
        
        const cart = await Cart.findOne({userId}).populate('items.productId')
        if(!cart || cart.items.length === 0 ){
            return res.status(400).json({ 
                success: false, 
                message: 'Cart is empty' 
            });
        }

        
        const userAddress =  await Address.findOne({userId})
        const selectedAddress = userAddress.address.id(addressId)
        if(!selectedAddress){
            return res.status(404).json({ 
                success: false, 
                message: 'Address not found' 
            });
        }
        //--> checking variant stock

        for(const item of cart.items){ 
            const product = await Product.findById(item.productId._id)
            const variant = product.variants.find(
                (v)=> v.color === item.variant.color &&
                      v.size === item.variant.size
            )
            if(!variant){
                return res.status(400).json({
                    success: false,
                    message: `Variant ${item.variant.color}/ ${item.variant.size} not found for ${product.productName}.`
                });
            }

            if(variant.stock < item.quantity){
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.productName} (${item.variant.color}/${item.variant.size}). Only ${variant.stock} available.`
                });
            }

            
            const total = product.variants.reduce((sum,v)=> sum + v.stock,0)
            product.status = total > 0 ? "Available" : 'out of stock'
            await product.save()
        }

        //total calculation

        let subtotal = 0 
        let discount = 0
        
        const orderItems = cart.items.map(item=>{
            const itemTotal = item.price * item.quantity
            subtotal += itemTotal

            if(item.productId.salesPrice && item.productId.salesPrice < item.productId.regularPrice){
                discount += (item.productId.regularPrice - item.productId.salesPrice) * item.quantity
            }

            return {
                product:item.productId._id,
                quantity:item.quantity,
                price:item.productId.salesPrice, 
                productName:item.productId.productName,
                productImage:item.productId.productImage[0],
                variant:{
                    color:item.variant.color,
                    size:item.variant.size,
                },
                totalPrice: itemTotal, 
                finalAmount:itemTotal,
                address:selectedAddress._id,
                status: "Pending",    
                statusHistory: [{
                    status: 'Pending',
                    date: new Date(),
                    note: 'Order placed'
                }]
            }
        })
        let couponDiscount = 0;
        let appliedCoupon = false

        if(req.session.appliedCoupon){ 
            appliedCoupon = true;
            const coupon = await Coupon.findById(req.session.appliedCoupon);
            if (coupon) {
                couponDiscount = Math.min(coupon.offerPrice, subtotal - discount);
            }
        }

        const shipping = subtotal> 1000? 0: 100;
        const total = subtotal - discount - couponDiscount + shipping

       
         //wallet update if(wallet selected) and checking insufficient fund
        if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ userId });

            if (!wallet || wallet.balance < total) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient wallet balance",
                    redirect: "/wallet"
                });
            }
        }

    
        // Create order
        const newOrder = new Order({
            userId,
            orderedItems:orderItems,
            totalPrice:total,
            discount,
            finalAmount:total,
            address: {
                addressType: selectedAddress.addressType,
                name: selectedAddress.name,
                city: selectedAddress.city,
                landMark: selectedAddress.landMark,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                phone: selectedAddress.phone,
                altPhone: selectedAddress.altPhone
            }, 
            paymentMethod:paymentMethod,
            status: 'Pending',  
            paymentStatus: paymentMethod === 'cod' ? 'Completed' : 'Payment Pending',
            invoiceDate: new Date(),
            couponApplied:appliedCoupon,
            couponDiscount: couponDiscount
        })

        await newOrder.save()
        //cod selected
        if(paymentMethod === 'cod'){
            await finalizeOrder(newOrder, cart, req);
            return res.json({
                success:true,
                orderId:newOrder._id,
                redirect: `/order/success?orderId=${newOrder._id}`
            })
        }

        //wallet balance updated if selected 
        if(paymentMethod === 'Wallet'){
            const wallet = await Wallet.findOne({ userId });

            wallet.balance -= total;

            wallet.transactions.push({
                date: new Date(),
                type: "debit",
                amount: total,
                reason: "Order Payment"
            });

            await wallet.save();

            newOrder.status = "Processing";
            newOrder.paymentStatus = "Paid";
            await newOrder.save(); 

            await finalizeOrder(newOrder, cart, req);

            return res.json({
                success: true,
                orderId: newOrder._id,
                redirect: `/order/success?orderId=${newOrder._id}` 
            });
        }
        //stripe selected
        if (paymentMethod === 'Stripe') {
            return res.json({
                success: true,
                orderId: newOrder._id,
                amount: total
            });
        }

        return res.json({
            success: false,
            message: 'Invalid payment method'
        });


    } catch (error) {
        console.log("Place order error:", error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
}
async function finalizeOrder1(order,cart,req) {
    //stock managing
        for(const item of cart.items){
            const product = await Product.findById(item.productId._id)
            const variant = product.variants.find(v=>
                v.color === item.variant.color &&
                v.size === item.variant.size
            )

            variant.stock -= item.quantity

            if(variant.stock <=0 ) {
                variant.stock =0 
            }
            
            const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
            product.status = totalStock > 0 ? "Available" : 'out of stock';
 
            await product.save()
        }

        //clear cart 
        cart.items = []
        await cart.save()

        //coupon delete
        if(req.session.appliedCoupon){
            delete req.session.appliedCoupon
        } 
    
}
//new placeorder-----------
 
const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user._id;

        // check if a coupon is already applied
        if (req.session.appliedCoupon) {
            return res.json({
                success: false,
                message: 'A coupon is already applied. Please remove it first.'
            });
        }

        //   check if it is a referral code
        const userWithReferral = await User.findOne({
            referalCode: couponCode.trim().toUpperCase()
        });

        if (userWithReferral) {
            // is it a user's own referral code
            if (userWithReferral._id.toString() === userId.toString()) {
                return res.json({
                    success: false,
                    message: "You cannot use your own referral code"
                });
            }

            // Check if user already redeemed this referral code
            const currentUser = await User.findById(userId);
            
            if (currentUser.redeemedUser && currentUser.redeemedUser.includes(userWithReferral._id)) {
                return res.json({
                    success: false,
                    message: 'You have already used this referral code'
                });
            }

            const referralDiscount = 100

            // store referral code info in session  
            req.session.appliedCoupon = {
                type: 'referral',
                code: userWithReferral.referalCode,
                referredUserId: userWithReferral._id.toString(),
                discount: referralDiscount
            };

            return res.json({
                success: true,
                message: 'Referral code applied successfully',
                discount: referralDiscount,
                couponCode: userWithReferral.referalCode
            });
        }

        // Check if it's a regular coupon
        const coupon = await Coupon.findOne({
            name: couponCode.trim().toUpperCase(),
            isList: true
        });

        if (!coupon) {
            return res.json({ 
                success: false, 
                message: 'Invalid Coupon or Referral code' 
            });
        }

        //  coupon expiry
        const now = new Date();
        if (now < coupon.createdOn || now > coupon.expireOn) {
            return res.json({ 
                success: false, 
                message: 'This coupon has expired' 
            });
        }
 
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.json({ 
                success: false, 
                message: 'Your Cart is empty' 
            });
        }
 
        let cartAmount = 0;
        cart.items.forEach(item => {
            const product = item.productId;
            if (product && !product.isBlocked && product.status === 'Available') {
                cartAmount += product.salesPrice * item.quantity;
            }
        });
 
        if (cartAmount < coupon.minimumPrice) {
            return res.json({ 
                success: false, 
                message: `Minimum purchase of ₹${coupon.minimumPrice} required for this coupon` 
            });
        }

        const discount = Math.min(coupon.offerPrice, cartAmount);
 
        req.session.appliedCoupon = {
            type: 'coupon',
            id: coupon._id.toString(),
            discount: discount
        };

        return res.json({
            success: true,
            message: 'Coupon applied successfully',
            discount,
            couponCode: coupon.name
        });

    } catch (error) {
        console.log('Error in applying coupon:', error);
        return res.json({
            success: false,
            message: 'Error in applying coupon'
        });
    }
};
 
const getCheckout = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        
        let addressDoc = await Address.findOne({ userId });
        if (!addressDoc) {
            addressDoc = new Address({ userId, address: [] });
            await addressDoc.save();
        }
        const userAddresses = addressDoc.address;

        const todayDate = new Date();
        const coupons = await Coupon.find({ 
            isList: true, 
            expireOn: { $gte: todayDate } 
        });

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        
        if (!cart || cart.items.length === 0) {
            return res.render('user/checkout', {
                user,
                cart: [],
                itemCount: 0,
                addresses: userAddresses,
                subtotal: "0.00",
                discount: "0.00",
                couponDiscount: "0.00",
                appliedCoupon: null,
                shipping: "0.00",
                total: "0.00",
                coupons: coupons,
            });
        }

        // filter valid items
        const validItems = cart.items.filter(item => {
            const product = item.productId;
            return product && !product.isBlocked && product.status === "Available";
        });

        if (validItems.length !== cart.items.length) {
            cart.items = validItems;
            await cart.save();
        }

        // Calculate subtotal and discount
        let subtotal = 0;
        let totalDiscount = 0;

        validItems.forEach(item => {
            const p = item.productId;
            const regular = p.regularPrice;
            const sale = p.salesPrice;
            const qty = item.quantity;
            const discount = regular - sale;

            subtotal += regular * qty;
            totalDiscount += Math.max(0,(regular - sale) * qty);
        });

        const cartAmount = subtotal - totalDiscount;
        // const shipping = subtotal >= 1000 ? 0 : 50;
        const shipping = subtotal >= 3000 ? 0 : 500;

        let couponDiscount = 0;
        let appliedCoupon = null;

        // applied coupon/referral code
        if (req.session.appliedCoupon) {
            const appliedData = req.session.appliedCoupon;

            if (appliedData.type === 'referral') { 
                couponDiscount = Math.min(appliedData.discount, cartAmount);
                appliedCoupon = {
                    name: appliedData.code,
                    offerPrice: appliedData.discount,
                    isReferral: true
                };
            } else if (appliedData.type === 'coupon') { 
                const coupon = await Coupon.findById(appliedData.id);
                
                if (coupon && coupon.isList && cartAmount >= coupon.minimumPrice) {
                    couponDiscount = Math.min(coupon.offerPrice, cartAmount);
                    appliedCoupon = coupon;
                } else { 
                    delete req.session.appliedCoupon;
                }
            }
        }

        const total = cartAmount - couponDiscount + shipping;

        res.render('user/checkout', {
            user,
            addresses: userAddresses,
            cart: cart.items,
            coupons,
            appliedCoupon,
            subtotal: subtotal.toFixed(2),
            // subtotal: cartAmount.toFixed(2),
            discount: totalDiscount.toFixed(2),
            couponDiscount: couponDiscount.toFixed(2),
            shipping,
            total: total.toFixed(2),
            itemCount: cart.items.length
        });

    } catch (error) {
        console.log("Checkout error:", error);
        res.redirect("/cart");
    }
};
 
const placeorder = async (req, res) => {
    try {
        const { addressId, paymentMethod } = req.body;
        const userId = req.session.user._id;
        //limit order per day 
        const nowDate = new Date()
        const startDate = new Date(nowDate.setHours(0,0,0,0))
        const endOfDay = new Date(nowDate.setHours(23, 59, 59, 999))

        const orderlist = await Order.find({userId,createdAt:{$gte:startDate,$lte:endOfDay}})
        if(orderlist.length >= 10 ){
            return res.status(400).json({
                success: false,
                message: 'User cannot order more than 2 '
            });
        }


        if (!addressId || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Address and payment method are required'
            });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        const userAddress = await Address.findOne({ userId });
        const selectedAddress = userAddress.address.id(addressId);
        if (!selectedAddress) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        // Check variant stock
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            const variant = product.variants.find(
                (v) => v.color === item.variant.color && v.size === item.variant.size
            );

            if (!variant) {
                return res.status(400).json({
                    success: false,
                    message: `Variant ${item.variant.color}/${item.variant.size} not found for ${product.productName}.`
                });
            }

            if (variant.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.productName} (${item.variant.color}/${item.variant.size}). Only ${variant.stock} available.`
                });
            }

            const total = product.variants.reduce((sum, v) => sum + v.stock, 0);
            product.status = total > 0 ? "Available" : 'out of stock';
            await product.save();
        }

// ===================================

        // let couponDiscount = 0;
        // let appliedCoupon = false;
        // let referralUserId = null;
        // let subtotal = 0;
        // let discount = 0;

        // //   coupon/referral discount
        // if (req.session.appliedCoupon) {
        //     appliedCoupon = true;
        //     const appliedData = req.session.appliedCoupon;

        //     if (appliedData.type === 'referral') {
        //         // Referral code
        //         couponDiscount = Math.min(appliedData.discount, subtotal - discount);
        //         referralUserId = appliedData.referredUserId;
        //     } else if (appliedData.type === 'coupon') {
        //         //   coupon code
        //         const coupon = await Coupon.findById(appliedData.id);
        //         if (coupon) {
        //             couponDiscount = Math.min(coupon.offerPrice, subtotal - discount);
        //         }
        //     }
        // }


        // // Calculate totals
        

        // const orderItems = cart.items.map(item => {
        //     const itemTotal = item.price * item.quantity;
        //     subtotal += itemTotal;

        //     //  
        //     // item discount
        //     let itemDiscount = (item.productId.regularPrice - item.productId.salesPrice) * item.quantity;

        //     // prorate coupon
        //     const totalItemsAmount = cart.items.reduce((sum, i) => i.price * i.quantity, 0);
        //     let itemCouponDiscount = 0;
        //     if(req.session.appliedCoupon){
        //         itemCouponDiscount = (itemTotal / totalItemsAmount) * couponDiscount;
        //     }

        //     // final per item
        //     const finalAmountPerItem = itemTotal - itemDiscount - itemCouponDiscount;

        //     //

        //     if (item.productId.salesPrice && item.productId.salesPrice <= item.productId.regularPrice) {
        //         discount += (item.productId.regularPrice - item.productId.salesPrice) * item.quantity;
        //     }

        //     return {
        //         product: item.productId._id,
        //         quantity: item.quantity,
        //         price: item.productId.salesPrice,
        //         productName: item.productId.productName,
        //         productImage: item.productId.productImage[0],
        //         variant: {
        //             color: item.variant.color,
        //             size: item.variant.size,
        //         },
        //         totalPrice: itemTotal,
        //         finalAmount: finalAmountPerItem,
        //         address: selectedAddress._id,
        //         status: "Pending",
        //         statusHistory: [{
        //             status: 'Pending',
        //             date: new Date(),
        //             note: 'Order placed'
        //         }]
        //     };
        // });

        
// ===============
        // subtotal and product offer/discount
        let subtotal = 0
        let discount = 0

        cart.items.forEach(item => {
            const regular = item.productId.regularPrice;
            const sale = item.productId.salesPrice;
            const qty = item.quantity;

            subtotal +=  regular * qty

            if(sale < regular) {
                discount += (regular- sale) * qty
            }

        })

        // applying coupon after subtotal
        let couponDiscount = 0;
        let appliedCoupon = false;
        let referralUserId = null;
        let couponId

        if(req.session.appliedCoupon){
            appliedCoupon = true

            const appliedData = req.session.appliedCoupon;
            couponId= req.session.appliedCoupon.id 
            

            if (appliedData.type === 'referral') {
                couponDiscount = Math.min(
                    appliedData.discount,
                    subtotal - discount
                );
                referralUserId = appliedData.referredUserId;
            }

            if (appliedData.type === 'coupon') {
                const coupon = await Coupon.findById(appliedData.id);
                if (coupon) {
                    couponDiscount = Math.min(
                        coupon.offerPrice,
                        subtotal - discount
                    );
                }
            }
        }

        // orderitems

        const orderItems = cart.items.map(item => {
            const itemTotal = item.productId.salesPrice * item.quantity;

            return {
                product: item.productId._id,
                quantity: item.quantity,
                price: item.productId.salesPrice,
                productName: item.productId.productName,
                productImage: item.productId.productImage[0],
                brand:item.productId.brand,
                category: Array.isArray(item.productId.category)?item.productId.category[0]:item.productId.category,
                variant: item.variant,
                totalPrice: itemTotal,
                address: selectedAddress._id,
                status: "Pending",
                statusHistory: [{
                    status: 'Pending',
                    date: new Date(),
                    note: 'Order placed'
                }]
            };
        });


        //final amount calculation

        // const shipping = subtotal >= 1000 ? 0 : 100;
        const shipping = subtotal >= 3000 ? 0 : 500;
        const totalPrice = subtotal - discount 
        const finalAmount = totalPrice - couponDiscount + shipping;

        // Check wallet balance  
        if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.balance < finalAmount) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient wallet balance",
                    redirect: "/wallet"
                });
            }
        }

        // Create order
        const newOrder = new Order({
            userId,
            orderedItems: orderItems,
            subtotal,
            totalPrice: totalPrice,
            discount,
            finalAmount: finalAmount,
            address: {
                addressType: selectedAddress.addressType,
                name: selectedAddress.name,
                city: selectedAddress.city,
                landMark: selectedAddress.landMark,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                phone: selectedAddress.phone,
                altPhone: selectedAddress.altPhone
            },
            paymentMethod: paymentMethod,
            status: 'Pending',
            paymentStatus: paymentMethod === 'cod' ? 'Completed' : 'Payment Pending',
            invoiceDate: new Date(),
            couponApplied: appliedCoupon,
            couponDiscount: couponDiscount,
            couponId:couponId
        });
        newOrder.orderStatusHistory.push({ // order history update 
            status:'Pending',
            date: new Date()
        })

        await newOrder.save();

        // referral code redemption
        if (referralUserId) {
            try { 
                let referredWallet = await Wallet.findOne({ userId: referralUserId });
                if (!referredWallet) {
                    referredWallet = new Wallet({
                        userId: referralUserId,
                        balance: 0,
                        transactions: []
                    });
                }
                referredWallet.balance += 100;
                referredWallet.transactions.push({
                    date: new Date(),
                    type: "credit",
                    amount: 100,
                    reason: `Referral reward`
                });
                await referredWallet.save();
 
                await User.findByIdAndUpdate(userId, {
                    $addToSet: { redeemedUser: referralUserId }
                });
 
                await User.findByIdAndUpdate(referralUserId, {
                    $addToSet: { redeemedUser: userId },
                    $set: { redeemed: true }
                });
            } catch (referralError) {
                console.log('Referral reward error (non-critical):', referralError);  
            }
        }

        //   payment methods
        if (paymentMethod === 'cod') {
            if(newOrder.totalPrice<3000){
                return res.json({
                    success: false,
                    message: 'Total amount must be greater than 3000 for COD'
                });
            }


            await finalizeOrder(newOrder, cart, req);
            return res.json({
                success: true,
                orderId: newOrder._id,
                redirect: `/order/success?orderId=${newOrder._id}`
            });
        }
        //wallet transaction
        if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ userId });
            wallet.balance -= finalAmount;
            wallet.transactions.push({
                date: new Date(),
                type: "debit",
                amount: finalAmount,
                reason: "Order Payment"
            });
            await wallet.save();

            newOrder.status = "Processing";
            newOrder.paymentStatus = "Paid";
            await newOrder.save();

            await finalizeOrder(newOrder, cart, req);

            return res.json({
                success: true,
                orderId: newOrder._id,
                redirect: `/order/success?orderId=${newOrder._id}`
            });
        }

        if (paymentMethod === 'Stripe') {
            return res.json({
                success: true,
                orderId: newOrder._id,
                amount: finalAmount
            });
        }

        return res.json({
            success: false,
            message: 'Invalid payment method'
        });

    } catch (error) {
        console.log("Place order error:", error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

async function finalizeOrder(order, cart, req) { 
    for (const item of cart.items) {
        const product = await Product.findById(item.productId._id);
        const variant = product.variants.find(v =>
            v.color === item.variant.color &&
            v.size === item.variant.size
        );

        variant.stock -= item.quantity;

        if (variant.stock <= 0) {
            variant.stock = 0;
        }

        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        product.status = totalStock > 0 ? "Available" : 'out of stock';

        await product.save();
    }
 
    cart.items = [];
    await cart.save();
 
    if (req.session.appliedCoupon) {
        delete req.session.appliedCoupon;
    }
}


const retryCancelledOrder = async (req,res) =>{
    try {
        const {orderId,paymentMethod} = req.body
        const userId = req.session.user._id

        // validations
        
        if (!orderId || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and payment method required'
            });
        }
        
        if(!["Wallet",'Stripe'].includes(paymentMethod)){
            return res.status(400).json({
                success: false,
                message: 'Only Wallet and Stripe allowed for retry'
            });
        }


        const order = await Order.findOne({_id: orderId,userId})
        
        if(!order){
            return res.status(404).json({
                success:false,
                message:'Order not found'
            })
        }

        if(order.status !== 'Cancelled'){
            return res.status(400).json({
                success:false,
                message:'Only Cancelled orders can be retried '
            })
        }

        //stock availability 

        for(const item of order.orderedItems){
            const product = await Product.findById(item.product)

            if(!product){
                return res.status(400).json({
                    success:false,
                    message:`Product "${item.productName}" is no longer available`
                })
            }

            const variant = product.variants.find(v=>
                v.color === item.variant.color &&
                v.size === item.variant.size
            )

            if(!variant){
                return res.status(400).json({
                    success:false,
                    message:`Variant "${item.variant.color/item.variant.size}" not found for Product "${item.productName}" `
                })
            }
            if(variant.stock < item.quantity){
                return res.status(400).json({
                    success:false,
                    message:`Insufficient stock for "${item.variants.color/item.variants.size}", only  "${variant.stock}" available `
                })
            }
        } //==============
        

            

            //payment 
            if(order.paymentMethod === 'Wallet'){
                const wallet = await Wallet.findOne({userId})
                if(!wallet || wallet.balance < order.finalAmount){
                    
                    return res.status(400).json({
                        success:false,
                        message:`Insufficient wallet balance `,
                        redirect:'/wallet'
                    })
                }

                wallet.balance -= order.finalAmount
                wallet.transactions.push({
                    date:new Date(),
                    type:'debit',
                    amount:order.finalAmount,
                    reason:`Retry payment for Order#${order.orderId}`
                })
                await wallet.save()
            }
            //stock update
            for(const item of order.orderedItems){
                const product = await Product.findById(item.product)
                const variant = product.variants.find(v=>
                    v.color  === item.variant.color &&
                    v.size  === item.variant.size
                )

                variant.stock -= item.quantity;

                const totalStock = product.variants.reduce((sum,v)=> sum + v.stock,0)
                product.status = totalStock > 0 ? "Available" : 'out of stock';
                
                await product.save()
 
            }

            //reset order and history

            order.status = paymentMethod === 'Wallet' ? 'Processing':'Pending'
            order.paymentStatus = paymentMethod === 'Wallet'?'Paid':'Payment Pending'
            order.paymentMethod = paymentMethod

            //cleaning status history 
            order.orderStatusHistory = [];

            // starts at Pending on retry
            order.orderStatusHistory.push({
            status: 'Pending',
            date: new Date(),
            note: 'Order retried after cancellation'
            });

            //  If wallet payment, 
            if (paymentMethod === 'Wallet') {
            order.orderStatusHistory.push({
                status: 'Processing',
                date: new Date(),
                note: 'Wallet payment successful'
            });
            }


            
            
            //reset item status in order
            for(const item of order.orderedItems){
                item.status = paymentMethod === 'Wallet' ? 'Processing':'Pending'
                item.cancellationReason = undefined;
                item.returnReason = undefined;
                item.returnRequestDate = undefined;

                item.refunded = false;
                item.restocked = false;

                item.statusHistory= [{
                    status: paymentMethod === 'Wallet' ? 'Processing':'Pending',
                    date: new Date(),
                    note:'Order retried after cancellation'
                }]

            }

            await order.save()


            //payment === stripe forward to stripe session
            if(paymentMethod === 'Stripe'){
                return res.json({
                    success:true,
                    message:'Ready for stripe payment',
                    orderId:order._id,
                    stripeCheckout:true
                });
            }


            //when wallet order is complete
            res.json({
                success:true,
                message:'Order successfully retried',
                OrderId:order._id, 
            }) 
        


    } catch (error) {
        console.error('Retry order error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
} 

const getOrderDetailsForRetry = async(req,res)=>{
    try {
        const orderId = req.params.id
        const userId = req.session.user._id

        const order = await Order.findOne({_id:orderId,userId})

        if(!order){
            return res.json({
                success:false,
                message:'Order not found'
            })
        }

        res.json({
            success:true,
            order:{
                _id:order._id,
                orderId:order.orderId,
                status:order.status,
                finalAmount:order.finalAmount,
                orderedItems:order.orderedItems
            }
        })
    } catch (error) {
        console.log('Error fetching order',error);
         res.json({
                success:false,
                message:'Server error'
            })
        
    }
}





//new code-------------------
const createStripeSession = async (req,res)=>{
    try {
        const {orderId} = req.body
        console.log('stripe requested payment order:',orderId)
        
        const order = await Order.findById(orderId)
        if(!order) return  res.json({ success: false, message: "Order not found" });

        const session = await stripe.checkout.sessions.create({
            payment_method_types:['card'],
            mode:'payment',
            line_items:[
                {
                    price_data:{
                        currency:'inr',
                        product_data:{
                            name:`Order #${orderId}`
                        },
                        unit_amount:order.finalAmount*100,
                    },
                    quantity:1,
                }
            ],
            success_url:`${process.env.BASE_URL}/payment/stripe/success?orderId=${orderId}`,
            cancel_url:`${process.env.BASE_URL}/payment/stripe/cancel?orderId=${orderId}`,
        })

        return res.json({
            success:true,
            url:session.url
        })

    } catch (error) {
        console.log('Stripe session error:',error);
        return res.json({ success: false, message: "Stripe session failed" });
     
    }
}

const stripeSuccess = async (req,res)=>{ 
    try {
         const { orderId } = req.query;

        if (!orderId) return res.redirect('/checkout');

        const order = await Order.findById(orderId);
        if (!order) return res.redirect('/checkout');
        // if (!order) return res.redirect('/order');

        // Update order status
        order.status = 'Processing';
        order.paymentStatus = 'Paid';
        order.orderStatusHistory.push({
            status:'Processing',
            date:new Date()
        })
        await order.save();
 
        const userId = order.userId;
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        
        if (cart) {
            await finalizeOrder(order, cart, req);
        }
        
        return res.redirect(`/order/success?orderId=${orderId}`);

        
    } catch (error) {
        console.log('Stripe success error:', error);
        return res.redirect('/checkout');
    }
}

const stripeCancel = async (req, res) => {
     try {
        const { orderId } = req.query;

        if (orderId) {
            // await Order.findByIdAndUpdate(orderId, {
            //     status: "Payment Failed",
            //     paymentStatus: "Failed"
            // });

            const order = await Order.findById(orderId)
            
            if(order && order.status === 'Pending'){
                for(const item of order.orderItems){
                    const product = await Product.findById(item.product)
                    if(product){
                        const variant  = product.variants.find(v=>
                            v.color === item.variant.color &&
                            v.size === item.variant.size
                        )
                        if(variant){
                            variant.stock += item.quantity
                            await product.save()
                        }
                    } 
                }

                order.status = 'Cancelled'
                order.paymentStatus = 'Failed'
                order.orderStatusHistory.push({
                    status:'Cancelled',
                    date:new Date()
                })

                await order.save()
            }
 
        } 

        return res.redirect(`/order/failed?orderId=${orderId}&reason=payment_canceled`);


    } catch (error) {
        console.log('Stripe cancel error:', error);
        return res.redirect('/checkout');
    }
};

const orderSuccessPage = async(req,res) => {
    try {
        const {orderId} = req.query
        if(!orderId)  return res.redirect('/order');

        res.render("user/order-success", {
            title: "Order Success",
            orderId
        });

    } catch (error) {
        console.log("Success Page Error:", error);
        return res.redirect("/order")
    }
}

const orderFailedPage = async(req,res) =>{
    try {
        const userId = req.session.user._id
        const { orderId, reason } = req.query
        res.render("user/order-failed", {
            title: "Payment Failed",
            orderId: orderId || null,
            reason: reason || "Unknown error",
            userId
        });

    } catch (error) {
        
    }
}


module.exports = {
    getCheckout,
    addNewAddress,
    updateAddress,
    deleteCheckoutAddress,
    applyCoupon,
    removeCoupon,
    placeorder,
    createStripeSession,
    stripeSuccess,stripeCancel,
    orderSuccessPage,
    orderFailedPage,
    retryCancelledOrder,
    getOrderDetailsForRetry
}