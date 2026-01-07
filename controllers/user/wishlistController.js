const Wishlist = require('../../models/wishlistSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Cart = require('../../models/cartSchema')

const loadWishlist1 = async(req,res)=>{
    try {
        const userId = req.session.user._id
        const user = await User.findById(userId)
        const products = await Product.find({
            _id:{$in:user.wishlist}}).populate('category')
        res.render('user/wishlist',{
            user,
            wishlist:products,

        })
    } catch (error) {
        console.log('Error in loading wishlist',error)
        res.redirect('/pageNotFound')
    }
}

const addToWishlist1= async (req,res)=>{
    try {
        const productId= req.body.productId
        const userId = req.session.user._id
        const user = await User.findById(userId)
        if(user.wishlist.includes(productId)){
            return res.status(400).json({status:false,message:'Product already in wishlist'})
        }

        user.wishlist.push(productId)
        await user.save()
         return res.status(200).json({status:true,message:'Product added to wishlist'})
    } catch (error) {
        console.log('Error in adding to wishlist',error)
         return res.status(500).json({status:false,message:'Server Error'})
    }
}

const removeProduct1 =async(req,res)=>{
    try {
        const productId = req.query.productId
        const userId = req.session.user._id
        const user = await User.findById(userId)
        const index = user.wishlist.indexOf(productId)
        user.wishlist.splice(index,1)
        await user.save()
        return res.redirect('/wishlist')
    } catch (error) {
        console.log('Error in removing product from wishlist',error)
         return res.status(500).json({status:false,message:'Server Error'})
        
    }
}

const loadWishlist= async (req,res)=>{
    try { 
        const userId = req.session.user._id
        const user = await User.findById(userId)
        
        const wishlist = await Wishlist.findOne({userId}).populate({
            path: "products.productId",
            populate: "category"
        });

        const cart = await Cart.findOne({userId})
        const cartProductIds = cart?cart.items.map(item=>item.productId.toString()) : []

        let products =[]
        if(wishlist){
            products = wishlist.products
            .map(item=> item.productId)
            .filter(p=>p!==null)
        }
        console.log(products)
        res.render('user/wishlist',{
            user,
            wishlist:products,
            cartProductIds

        })
         
    } catch (error) {
        console.log('Error lodaing wishlist',error)
         return res.status(500).json({status:false,message:'Server Error'})
    }
}
const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        if(!req.session.user){
            return res.status(401).json({
                status: false,
                message: "Please login first"
            });
        }
        const userId = req.session.user._id;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(400).json({ status: false, message: "Product not found" });
        }

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        const exists = wishlist.products.some(
            item => item.productId.toString() === productId
        );

        if (exists) {
            return res.status(400).json({ status: false, message: "Product already in wishlist" });
        }

        wishlist.products.push({ productId });
        await wishlist.save();

        return res.status(200).json({
            status: true,
            message: "Product added to wishlist"
        });

    } catch (error) {
        console.log("Error adding to wishlist", error);
        return res.status(500).json({ status: false, message: "Server Error" });
    }
};
const removeProduct = async (req, res) => {
    try {
        const productId = req.query.productId;
        const userId = req.session.user._id;

        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) return res.redirect("/wishlist");

        wishlist.products = wishlist.products.filter(
            item => item.productId.toString() !== productId
        );
        // const index = wishlist.products.indexOf(productId)
        // wishlist.products.splice(index,1) 

        await wishlist.save();

        return res.redirect("/wishlist");

    } catch (error) {
        console.log("Error removing product from wishlist", error);
        return res.status(500).json({ status: false, message: "Server Error" });
    }
};

const deleteWishlist =async (req,res)=>{
    try { 
        const userId = req.session.user._id
        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist || wishlist.products.length===0)return res.json({ status: false, message: "No items to clear " }); 
        wishlist.products = []
        console.log('===================>',wishlist)
        await wishlist.save() 
        res.json({ status: true, message: "Wishlist cleared" });

    } catch (error) {
        console.log("Clearing wishlist error", error);
        res.json({ status: false, message: "Server error" });
        
    }
}



module.exports = {
    loadWishlist,
    addToWishlist,
    removeProduct,
    deleteWishlist
}