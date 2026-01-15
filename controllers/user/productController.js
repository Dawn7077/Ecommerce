
// const Product = require('../../models/productSchema')
// const Category = require('../../models/categorySchema')
// const Wishlist = require('../../models/wishlistSchema')
// const Cart = require('../../models/cartSchema')
// const User = require('../../models/userSchema')

import Product from '../../models/productSchema.js'
import Category from '../../models/categorySchema.js'
import Wishlist from '../../models/wishlistSchema.js'
import Cart from '../../models/cartSchema.js'
import User from '../../models/userSchema.js'



const productDetails=async(req,res)=>{
    try {

        const userSession = req.session.user
        const userId = userSession ? userSession._id : null;
 
        const userData = userId ? await User.findById(userId) : null;
        const productId =req.query.id
        const product =await Product.findById(productId).populate('category')
        // if(product.isBlocked)return res.redirect('/shop')
        // const findCategory = product.category
        const findCategory = Array.isArray(product.category) ? product.category[0] : product.category;
        const categoryOffer = findCategory?.categoryOffer||0
        const productOffer = product.productOffer||0
        let totalOffer = 0
        if(product.productOffer !== undefined  && findCategory?.categoryOffer !== undefined && product.productOffer !== null  && findCategory?.categoryOffer !== null ){
            totalOffer = Math.max(categoryOffer , productOffer)
        }
        else if(product.productOffer !== undefined  && product.productOffer !== null ){
            totalOffer = product.productOffer
        }else if(findCategory?.categoryOffer !== undefined && findCategory?.categoryOffer !== null){
            totalOffer = findCategory?.categoryOffer
        }   
        const recommendedProducts = await Product.find({ category: findCategory._id, _id: { $ne: productId } }).limit(4);
        // console.log(product.description)

        if(product.isBlocked==='true')return redirect('/shop')
        // if(product.isBlocked==='true')return redirect('/shop')
        console.log(findCategory)
        console.log(totalOffer)

        let wishlistProducts = []

        if(userId){
            const wishlist = await Wishlist.findOne({userId})
            if(wishlist) wishlistProducts = wishlist.products
        }



        res.render('user/product-details',{
            user:userData,
            product:product,
            quantity:product.quantity,
            totalOffer,
            category:findCategory,
            wishlist:wishlistProducts,
            recommendedProducts,
            crumbs: [
                    { label: "Home", url: "/" },
                    { label: "Shop", url: "/shop" },
                    { label: product.productName, url: "/productDetails?id="+ productId}
                ]
        })


    } catch (error) {
        console.error('Error in fetching product Details',error);        
        res.redirect('/pageNotFound')
    }
}
 
export {
    productDetails, 
}