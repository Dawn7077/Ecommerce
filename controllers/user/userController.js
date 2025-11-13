const User =require("../../models/userSchema")
const mongoose = require('mongoose');

const nodemailer =require('nodemailer')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Banner = require('../../models/bannerSchema')
const Brand = require('../../models/brandSchema')
const bcrypt = require('bcrypt')
const { search } = require("../../routes/userRouter");
const { productDetails } = require("./productController");
const env = require("dotenv").config()

const loadHomePage = async (req,res)=>{
    try {
        const today = new Date().toISOString()
        const findBanner = await Banner.find({
            startDate:{$lt:new Date(today)},
            endDate:{$gt:new Date(today)},
        })
        const user = req.session.user
        const categories =await Category.find({isListed:true})
        let productData  = await Product.find({
            isBlocked:false,
            category:{$in:categories.map(category=>category._id)},
            quantity:{$gt:0}
        })


        productData.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))
        productData = productData.slice(0,4)


        if(user){
            const UserData =await User.findOne({_id:user._id})
            res.render('user/home',{user:UserData, productData,banner:findBanner||[]})
        }else{
            return res.render('user/home',{user:null,productData,banner:findBanner||[]})
        }

    } catch (error) {
        console.log("home page not found");
        res.status(500).send('server error')
    }
}
const pageNotFound = async(req,res)=>{
    try {
        res.render('user/page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}
const loadSignUp = async(req,res)=>{
    try {
        return res.render('user/signup')
    } catch (error) {
        console.log('Home page not loading',error)
        res.status(500).send('Server Error')
    }
}

// const signup = async (req,res)=>{
//     const {name, email,phone,password,cPassword}=req.body 
//     try {
//         const newUser = new User({name, email,phone,password})
//         console.log(cPassword);
//         // console.log(newUser);
        
//         await newUser.save()

//         return res.redirect('/signup')
//     } catch (error) {
//         console.error("Error for saved user",error);
//         res.status(500).send('Internal server error')
        
//     }
// }

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString()
}
async function sendVerificationEmail(email,otp){
    try {
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })  

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP:${otp}</b>`
        })

        return info.accepted.length>0

    } catch (error) {
        console.error('Error sending email',error)
        return false
    }
}
const signup = async(req,res)=>{
    try {
        const {name,email,phone,password,cPassword}=req.body
        if(password!==cPassword){
            return res.render('user/signup',{message:"Password do not match"})
        }
        const findUser = await User.findOne({email})
        if(findUser){
            return res.render('user/signup',{message:"User with this email already exists"})
        }
        const otp = generateOtp()
        const emailSent = await sendVerificationEmail(email,otp)
        if(!emailSent){
            return res.json('email-error')
        }
        req.session.userOtp = otp
        req.session.userData = {name,email,phone,password}

        res.render("user/verify-otp")
        console.log('OTP sent',otp)

    } catch (error) {
        console.error('user/signup error',error)
        res.redirect('/pageNotFound')
    }
}
const securePassword = async(password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        
    }
}
const verifyOtp = async(req,res)=>{
    try {
        const {otp} = req.body
        console.log(otp)
        if(otp === req.session.userOtp){//for google already signedup email which dont have a password
            const user = req.session.userData
            const existingUser = await User.findOne({email:user.email})
            if(existingUser){
                req.session.user ={
                    _id:existingUser._id,
                    name:existingUser.name,
                    email:existingUser.email
                }
                return res.json({success:true,redirectUrl:'/'})
            }




            const passwordHash = await securePassword(user.password)
            const saveUserData = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password: passwordHash,
            })
            await saveUserData.save()
            req.session.user={
                _id:saveUserData._id,
                name:saveUserData.name,
                email:saveUserData.email
            }
            res.json({success:true,redirectUrl:'/'})
        }else{
            res.status(400).json({success:false,message:'Invalid OTP, Please try again'})
        }
    } catch (error) {
        console.error("Error verifying OTP",error);
        res.status(500).json({success:false,message:"An error has occured"})
        
    }
}
const resendOtp = async(req,res)=>{
    try {
        const {email}= req.session.userData
        if(!email){
            return res.status(400).json({success:false,message:'Email not found in session'})
        }
        const otp = generateOtp()
        req.session.userOtp = otp

        const emailSent =await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log('Resent OTP',otp);
            res.status(200).json({success:true,message:'OTP Resent Successfully'})
            
        }else{
             res.status(500).json({success:false,message:'Failed to Resent OTP, Please try again'})
           
        }
    } catch (error) {
        console.error("Error resending OTP");
        
        res.status(500).json({success:false,message:'Internal Server Error'})
           
    }
}

const loadlogin = async(req,res)=>{
    try {
        if(!req.session.user){
            return res.render("user/login")
        }else{
            res.redirect('/')
        }

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const login = async(req,res)=>{
    try {
        const{email,password}= req.body
        const findUser  = await User.findOne({isAdmin:0,email:email})
        
        if(!findUser){
            return res.render('user/login',{message:"User Not found"})
        }
        if(findUser.isBlocked){
            res.render('user/login',{message:"User is Blocked by admin"})
        }

        const passportMatch = await bcrypt.compare(password,findUser.password)

        if(!passportMatch){
            return res.render('user/login',{message:"Incorrect Password"})
        }

        req.session.user = {
            _id:findUser._id,
            name:findUser.name,
            email:findUser.email,
        }
        res.redirect('/')

    } catch (error) {
        console.error("login error",error);
        res.render('user/login',{message:"Login Failed ,Please try again later"})
        
    }
}
const logout = async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log('Session destruction error',err.message);
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/login')
        })
    } catch (error) {
        console.error("Logout Error",error);
        res.redirect('/pageNotFound')
        
    }
}
const loadShoppingPage = async(req,res)=>{
    try {
        const user = req.session.user
        const userData = await User.findOne({_id:user})
        const categories = await Category.find({isListed:true})
        const categoryIds = categories.map(category=>category._id.toString())
        const page = parseInt(req.query.page) || 1
        const limit =9
        const skip =(page-1)*limit
        const products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity:{$gt:0},

        })
        .sort({createdAt:-1}).skip(skip).limit(limit)

        const totalProducts = await Product.countDocuments({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity:{$gt:0},
        })

        const totalPages = Math.ceil(totalProducts/limit)

        const brands =  await Brand.find({isBlocked:false})
        const categoriesWithIds =  categories.map(category=>({_id:category._id,name:category.name}))

        res.render("user/shop",{
            user:userData,
            products:products,
            category:categoriesWithIds,
            brand:brands,
            totalProducts,
            currentPage:page,
            totalPages,
            selectedCategory:null,
            selectedBrand:null,
            selectedPrice: null,

        })

    } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
    }
}

const filterProduct = async(req,res)=>{
    try {
        const user = req.session.user
        const category = req.query.category
        const brand = req.query.brand
        const findCategory = category? await Category.findOne({_id:category}):null;
        const findBrand = brand? await Brand.findOne({_id:brand}):null;
        const brands = await Brand.find({}).lean()
        const query = {
            isBlocked:false,
            quantity:{$gt:0},
        }

        if(findCategory){
            query.category = findCategory._id
        }
        if(findBrand){
            query.brand = findBrand.brandName
        }

        let findProducts = await Product.find(query).lean()
        findProducts.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))

        const categories = await Category.find({isListed:true})

        let itemsPerPage =6

        let currentPage = parseInt(req.query.page)||1
        let startIndex = (currentPage-1)*itemsPerPage
        let endIndex = startIndex + itemsPerPage
        let totalPages = Math.ceil(findProducts.length/itemsPerPage)
        const currentProduct = findProducts.slice(startIndex,endIndex)

        let userData = null
        if (user) {
            userData = await User.findOne({ _id: user });
            if (userData) {
                const searchEntry = {
                category: findCategory ? findCategory._id : null,
                brand: findBrand ? findBrand.brandName : null,
                searchedOn: new Date()
                };

                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }


        req.session.fiterProducts = currentProduct
        
        res.render('user/shop',{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            totalPages,
            currentPage,
            selectedCategory:category||null,
            selectedBrand:brand||null,
            selectedPrice: null,
        })

    } catch (error) {
        console.log('Error in filterProduct',error)
        res.redirect('/pageNotFound')
    }
}

const filterByPrice = async(req,res)=>{
    try {
        const user =req.session.user 
        const userData  = await User.findOne({_id:user})
        const brand = await Brand.find({}).lean()
        const category = await Category.find({isListed:true}).lean()
        let gt = parseFloat(req.query.gt) || 0
        let lt = parseFloat(req.query.lt) || 1000000

        let findProducts = await Product.find({
            salesPrice:{$gt:gt,$lt:lt},
            isBlocked:false,
            quantity:{$gt:0},

        }).lean()

        findProducts.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))

        let itemsPerPage =6

        let currentPage = parseInt(req.query.page)||1
        let startIndex = (currentPage-1)*itemsPerPage
        let endIndex = startIndex + itemsPerPage
        let totalPages = Math.ceil(findProducts.length/itemsPerPage)
        const currentProduct = findProducts.slice(startIndex,endIndex)

        req.session.fiterProducts = findProducts
        res.render('user/shop',{
            user:userData,
            products:currentProduct,
            category:category,
            brand:brand,
            totalPages,
            currentPage,
            selectedCategory:null,
            selectedBrand:null,
            selectedPrice: { gt, lt },
        })

    } catch (error) {
        console.log('Error in filterByPrice',error)
        res.redirect('/pageNotFound')
    }
}
 
const searchProducts = async(req,res)=>{
    try {
        const user =req.session.user 
        const userData  = await User.findOne({_id:user})
        const search = req.body.query

        const brands = await Brand.find({}).lean()
        const categories = await Category.find({isListed:true}).lean()
        const categoryIds = categories.map(category=>category._id.toString())
        let searchResult = []
        if(req.session.fiterProducts && req.session.fiterProducts.length>0){
            searchResult = req.session.fiterProducts.filter(product =>
                product.productName.toLowerCase().includes(search.toLowerCase())
            );
        }else{
            searchResult = await Product.find({
                productName:{$regex:'.*'+search+'.*',$options:'i'},
                isBlocked:false,
                quantity:{$gt:0},
                category:{$in:categoryIds}
            })
        }

        searchResult.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))

        let itemsPerPage =6

        let currentPage = parseInt(req.query.page)||1
        let startIndex = (currentPage-1)*itemsPerPage
        let endIndex = startIndex + itemsPerPage
        let totalPages = Math.ceil(searchResult.length/itemsPerPage)
        const currentProduct = searchResult.slice(startIndex,endIndex)

         res.render('user/shop',{
            user:userData,
            products:currentProduct,
            category:categories,
            brand:brands,
            totalPages,
            currentPage,
            count:searchResult.length,
            selectedCategory:null,
            selectedBrand:null,
            selectedPrice: null,
        })



    } catch (error) {
        console.log('Error in filterByPrice',error)
        res.redirect('/pageNotFound')
    }
}


module.exports = {
    loadHomePage,
    loadSignUp,
    signup,
    verifyOtp,
    resendOtp,
    loadlogin,
    login,
    logout,
    pageNotFound,
    loadShoppingPage,
    filterProduct,
    filterByPrice,
    searchProducts
}