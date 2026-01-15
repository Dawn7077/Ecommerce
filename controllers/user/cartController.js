// const User = require('../../models/userSchema')
// const Product = require('../../models/productSchema')
// const Cart = require('../../models/cartSchema')

import User from '../../models/userSchema.js'
import Product from '../../models/productSchema.js'
import Cart  from '../../models/cartSchema.js'

// const loadCart =async(req,res)=>{
//     try {
//         const id = req.session.user._id
//         const user = await User.findById(id)
//         const productIds = user.cart.map(item=>item.productId)
//         const products = await Product.find({_id:{$in:productIds}})
//     } catch (error) {
        
//     }
// }
const loadCart =async(req,res)=>{
    try {
        const userId = req.session.user._id
        

        let cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            populate: { path: "category" } 
        });
        if(!cart){
            cart = new Cart({userId,items:[]})
            await cart.save()
        }
        //filtering the product
        const filteredItems = cart.items.filter(item=>{
            const product = item.productId
            return( product && !product.isBlocked && product.totalStock > 0);  
        })
        if (filteredItems.length !== cart.items.length) {
            cart.items = filteredItems;
            await cart.save();
        }
        //Calculating subtotal
        let subtotal = 0
        cart.items.forEach(item=>{
            item.price = item.productId.salesPrice
            item.totalPrice = item.price *item.quantity
            subtotal += item.totalPrice
        })
        await cart.save();

        res.render("user/cart", {
            data: cart,
            grandTotal: subtotal,
            user: req.session.user
        }); 
    } catch (error) {
        console.log(error);
        res.redirect("/pageNotFound");
    }
}

const addToCart = async (req, res) => {
    try {
        const{ productId, color , size }= req.body;
        const quantity = parseInt(req.body.quantity) || 1
       
        if(!req.session.user){
            return res.json({
                status: false,
                message: "Please login first"
            });
        }

        const userId = req.session.user._id;


        const product = await Product.findById(productId).populate("category");
        // console.log('cart request',product.totalStock)

        if (!product) {
            return res.json({ status: false, message: "Product not found" });
        }

        if (product.isBlocked || (product.category && product.category.islisted === false)) {
            return res.json({ status: false, message: "Product is currently unavailable" });
        }

        if (product.totalStock <= 0) {
            return res.json({ status: false, message: "Product out of stock" });
        }

        const variant = product.variants.find(v=>
            v.color === color && v.size === size
        )
        if(!variant){ 
            return res.json({ status: false, message: "Variant not found" });
        }
        if(variant.stock <= 0){
            return res.json({ status: false, message: "Selected Variant out of stock" });
        }
        if(variant.stock<quantity){
            return res.json({ status: false, message: `Only ${variant.stock} units available` });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }
 
        const existingItem = cart.items.find(item => 
            item.productId.toString() === productId &&
            item.variant.color === color &&
            item.variant.size === size 
        );

        if (existingItem) {
            // if (existingItem.quantity >= 3) {
            //     return res.json({ status: false, message: "Limit: Only 3 items allowed" });
            // }

            if (existingItem.quantity + quantity > variant.stock) {
                return res.json({ status: false, message: `Only ${variant.stock} units available. You already added ${existingItem.quantity}`});
            }
 
            existingItem.quantity += quantity;
            existingItem.price = product.salesPrice;
            existingItem.totalPrice = product.salesPrice * existingItem.quantity;


        } else { 
            cart.items.push({
                productId,
                variant:{ color,size },
                quantity: quantity,
                price: product.salesPrice,
                totalPrice: product.salesPrice
            });
        }

        await cart.save();

        return res.json({
            status: true,
            message: "Added to cart successfully"
        });

    } catch (error) {
        console.log("Add to cart error", error);
        res.json({ status: false, message: "Server error" });
    }
};

const updateCart = async (req, res) => {
    try {
        const productId = req.body.productId;
        const userId = req.session.user._id;
        const changeCount = req.body.change

        const product = await Product.findById(productId).populate("category");

        if (!product) {
            return res.json({ status: false, message: "Product not found" });
        }

        if (product.isBlocked || (product.category && product.category.islisted === false)) {
            return res.json({ status: false, message: "Product is currently unavailable" });
        }

        // if (product.quantity <= 0) {
        //     return res.json({ status: false, message: "Product out of stock" });
        // }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.json({ status: false, message: "cart not found" });
        }
 
        const item = cart.items.find(i=> i.productId.toString()=== productId)
        
        if(!item)  return res.json({ status: false, message: "item not in cart" });

        const newQuantity = item.quantity + changeCount

        if(newQuantity < 1)  return res.json({ status: false, message: "Minimum 1 item required" }); // for when we minus the stock and not going below 1

        
        const selectedVariant = product.variants.find(v=>
            v.color === item.variant.color && 
            v.size === item.variant.size 
            
        )
        if(!selectedVariant) return res.json({status:false, message:"Variant not found"});

        if(newQuantity > selectedVariant.stock)  return res.json({ status: false, message: "Not enough stock for selected variant" });


        item.quantity = newQuantity
        item.price = product.salesPrice
        item.totalPrice = newQuantity * item.price

        const grandTotal = cart.items.reduce((sum,item)=>{
            return sum + item.totalPrice
        },0)

        await cart.save()
        
        return res.json({
            status:true,
            quantity:newQuantity,
            itemSubtotal: item.totalPrice,
            grandTotal
        })
 
    } catch (error) {
        console.log("update cart error", error);
        res.json({ status: false, message: "Server error" });
    }
};

const deleteItemCart = async (req,res)=>{
    try {
        const userId = req.session.user._id
        const productId = req.params.productId

        let cart = await Cart.findOne({userId})

        if(!cart) return res.json({ status: false, message: "cart not found" });

        cart.items = cart.items.filter(item=> item.productId.toString()!== productId)

        const grandTotal = cart.items.reduce((sum,item)=> sum + item.totalPrice, 0 )

        await cart.save()

        return res.json({
            status:true,
            message:"Item removed",
            grandTotal
        })


    } catch (error) {
        console.log("update cart error", error);
        res.json({ status: false, message: "Server error" });
    }
}

const deleteCart= async(req,res)=>{
    try {
        const userId = req.session.user._id
        
        let cart = await Cart.findOne({userId})
        if(!cart) return res.json({ status: false, message: "cart not found" }); 
        cart.items = []
        await cart.save()
        res.json({ status: true, message: "Cart cleared" });
        
    } catch (error) {
        console.log("Clearing cart error", error);
        res.json({ status: false, message: "Server error" });
        
    }
}
const variantData = async(req,res)=>{
    try {
        const product = await Product.findById(req.params.id)
        res.json({ variants:product.variants })
    } catch (error) {
        console.log("Variant data error:", error);
        res.json({ status: false, message: "Server error" });
    }
}


export  {
    loadCart,
    addToCart,
    updateCart,
    deleteItemCart,
    deleteCart,
    variantData,
}