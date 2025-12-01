const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Cart = require('../../models/cartSchema')
const Coupon = require('../../models/couponSchema')
const Order = require('../../models/orderSchema') 

const getCheckout = async(req,res)=>{
    try {
        const userId = req.session.user._id
        const user = await User.findById(userId)
        let addressDoc = await Address.findOne({userId})
        if(!addressDoc){
            addressDoc = new Address({userId, address:[]})
            await addressDoc.save()
        }
        const userAddresses = addressDoc.address // array of address[]

        const coupons = await Coupon.find({isList:true})
        // console.log('==>',coupons)
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


const getCheckout1 = async (req, res) => {
    try {
        const userId = req.session.user._id; 
        const user = await User.findById(userId); 
        let addressDoc = await Address.findOne({ userId }); 
        if (!addressDoc) {
            addressDoc = new Address({ userId, address: [] });
            await addressDoc.save();
        }

        const addresses = addressDoc.address;
 
        const cart = await Cart.findOne({ userId }).populate("items.productId");

        if (!cart || cart.items.length === 0) {
            return res.render("user/checkout", {
                user,
                cart: [],
                addresses,
                subtotal: "0.00",
                discount: "0.00",
                couponDiscount: "0.00",
                shipping: "0.00",
                total: "0.00",
                itemCount: 0,
                availableCoupons: [],
                appliedCoupon: null,
            });
        }
 
        const validItems = cart.items.filter(item => {
            const product = item.productId;
            return product && !product.isBlocked && product.status === "Available";
        });

        // If items removed, update cart
        if (validItems.length !== cart.items.length) {
            cart.items = validItems;
            await cart.save();
        }

        // PRICE CALCULATIONS
        let subtotal = 0;
        let totalDiscount = 0;

        validItems.forEach(item => {
            const p = item.productId;

            const regular = p.regularPrice;
            const sale = p.salesPrice;
            const qty = item.quantity;

            const discount = regular - sale;

            subtotal += regular * qty;
            totalDiscount += discount * qty;

            // Adding computed fields (optional but helpful)
            item.price = sale;
            item.originalPrice = regular;
            item.discount = discount;
            item.totalPrice = sale * qty;
        });

        // After item discounts
        const cartAmount = subtotal - totalDiscount;

        // SHI P P I N G
        const shipping = subtotal >= 1000 ? 0 : 50;

        // No coupons for now (simple)
        const couponDiscount = 0;
        const appliedCoupon = null;
        const availableCoupons = []; // later you can expand

        // Final amount
        const total = cartAmount - couponDiscount + shipping;

        // Render
        return res.render("user/checkout", {
            user,
            cart: validItems,
            addresses,
            subtotal: subtotal.toFixed(2),
            discount: totalDiscount.toFixed(2),
            couponDiscount: couponDiscount.toFixed(2),
            shipping: shipping.toFixed(2),
            total: total.toFixed(2),
            itemCount: validItems.length,
            availableCoupons,
            appliedCoupon,
        });

    } catch (error) {
        console.error("Checkout error:", error);
        return res.redirect("/cart");
    }
};


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


const applyCoupon = async(req,res)=>{
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

const placeorder = async (req,res)=>{
    try {
        const {addressId,paymentMethod} = req.body
        const userId = req.session.user._id

        // const check = add.address.filter(a=>a._id.toString() === addressId) 
        // const order = await Order.findOne({userId})
        // console.log(addressId,paymentMethod,cart)
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

        for(const item of cart.items){
            const product = item.productId
            if(product.quantity < item.quantity){
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.productName}. Only ${product.quantity} available.`
                });
            }
        }

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
            status:paymentMethod==='cod'?'Pending':'Payment Pending',
            status: paymentMethod === 'cod' ? 'Pending' : 'Payment Pending',
            invoiceDate: new Date(),
            couponApplied:appliedCoupon,
            couponDiscount: couponDiscount
        })

        await newOrder.save()
        //stock managing
        const Product = require('../../models/productSchema')

        for(const item of cart.items){
            const product = await Product.findById(item.productId._id)
            product.quantity -= item.quantity

            if(product.quantity <= 0){
                product.status = 'out of stock'
                product.quantity = 0
            }
            await product.save()
        }

        //clear cart 
        cart.items = []
        await cart.save()

        //coupon delete
        if(req.session.appliedCoupon){
            delete req.session.appliedCoupon
        }


        if(paymentMethod === 'cod'){
            return res.json({
            success:true,
            orderId:newOrder._id,
            // redirect:'/cart'
            redirect: `/order`
        })
        }

        


    } catch (error) {
        console.log("Place order error:", error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
}

module.exports = {
    getCheckout,
    addNewAddress,
    updateAddress,
    deleteCheckoutAddress,
    applyCoupon,
    removeCoupon,
    placeorder
}