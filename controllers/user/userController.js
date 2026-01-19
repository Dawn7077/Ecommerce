// const User =require("../../models/userSchema")
// const mongoose = require('mongoose');

// const nodemailer =require('nodemailer')
// const Category = require('../../models/categorySchema')
// const Product = require('../../models/productSchema')
// const Banner = require('../../models/bannerSchema')
// const Brand = require('../../models/brandSchema')
// const WishLish = require('../../models/wishlistSchema')
// const bcrypt = require('bcrypt')
// const { search } = require("../../routes/userRouter");
// const { productDetails } = require("./productController");
// const { parse } = require("dotenv");
// const env = require("dotenv").config()



import User from '../../models/userSchema.js'
import mongoose from 'mongoose'
import Category from '../../models/categorySchema.js'
import Product from '../../models/productSchema.js'
import Banner from '../../models/bannerSchema.js'
import Brand from '../../models/brandSchema.js'
import WishLish from '../../models/wishlistSchema.js'
import bcrypt from 'bcrypt'
import { productDetails } from "./productController.js"
import StatusCodes from '../../utils/httpStatus.js'
import dotenv from 'dotenv'
dotenv.config()

import { generateOtp } from '../../utils/otp.js'
import { sendVerificationEmail } from '../../services/emailServices.js'


const loadHomePage = async (req,res)=>{
    try {
        const now = new Date(); 
        const findBanner = await Banner.find({
            startDate: { $lte: now },
            endDate: { $gte: now },
        });
        const user = req.session.user
        const categories =await Category.find({isListed:true})
        let productData  = await Product.find({
            isBlocked:false,
            category:{$in:categories.map(category=>category._id)},
            // quantity:{$gt:0}
            variants: { $elemMatch: { stock: { $gt: 0 } } }
        })


        productData.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))
        productData = productData.slice(0,4)

        let wishlistProducts = []
        if(user){
            let userId = user._id
            const wishlist = await WishLish.findOne({userId})
            wishlistProducts = wishlist ? wishlist.products : []; 
        }



        if(user){
            const UserData =await User.findOne({_id:user._id})
            res.render('user/home',{user:UserData,wishlist:wishlistProducts, productData,banner:findBanner||[]})
        }else{
            return res.render('user/home',{user:null,wishlist:wishlistProducts,productData,banner:findBanner||[]})
        }

    } catch (error) {
        console.log("home page not found");
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('server error')
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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Server Error')
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



const signup = async(req,res)=>{
    try {
        const {name,email,phone,password,cPassword}=req.body
        if(password!==cPassword){
            return res.render('user/signup',{message:"Password do not match"})
        }
        const findUser = await User.findOne({email})
        if(findUser){
            if(findUser.isGoogleUser){
                return res.render('user/signup',{message:"User with this email already exists, Please login using Google"})
            }

            return res.render('user/signup',{message:"User with this email already exists"})
        }
        const otp = generateOtp()
        const emailSent = await sendVerificationEmail(email,otp)
        if(!emailSent){
            return res.json('email-error')
        }
        req.session.userOtp = otp
        req.session.userData = {name,email,phone,password}

        console.log('OTP sent',otp)
        // res.render("user/verify-otp")
        return res.redirect('/verify-otp')

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
const getVerifyOtp = async (req,res) => {
    try {
        res.render("user/verify-otp")
    } catch (error) {
        console.error('getVerifyOtp',error)
        res.redirect('/pageNotFound')
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
            
            
            let referralCode = generateReferralCode(user.name);
            while (await User.findOne({ referalCode: referralCode })) {
                referralCode = generateReferralCode(user.name);
            }


            const saveUserData = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password: passwordHash,
                referalCode: referralCode
            })
            await saveUserData.save()
            req.session.user={
                _id:saveUserData._id,
                name:saveUserData.name,
                email:saveUserData.email
            }
            res.json({success:true,redirectUrl:'/'})
        }else{
            res.status(StatusCodes.BAD_REQUEST).json({success:false,message:'Invalid OTP, Please try again'})
        }
    } catch (error) {
        console.error("Error verifying OTP",error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:"An error has occured"})
        
    }
}
const resendOtp = async(req,res)=>{
    try {
        const {email}= req.session.userData
        if(!email){
            return res.status(StatusCodes.BAD_REQUEST).json({success:false,message:'Email not found in session'})
        }
        const otp = generateOtp()
        req.session.userOtp = otp

        const emailSent =await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log('Resent OTP',otp);
            res.status(StatusCodes.OK).json({success:true,message:'OTP Resent Successfully'})
            
        }else{
             res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:'Failed to Resent OTP, Please try again'})
           
        }
    } catch (error) {
        console.error("Error resending OTP",error);
        
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:'Internal Server Error'})
           
    }
}

const loadlogin = async(req,res)=>{
    try {
        const errorMsg = req.query.errorMsg ||'' 
        if(!req.session.user){
            return res.render("user/login",{errorMsg: errorMsg})
        }else{
            res.redirect('/')
        }

    } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
    }
} 
const login = async(req,res)=>{
    try {
        const{email,password}= req.body
        const findUser  = await User.findOne({isAdmin:0,email:email}) 
        
        if(!findUser){
            return res.render('user/login',{message:"User Not found" ,errorMsg:''})
        }
        if(findUser.isBlocked){
           return res.render('user/login',{message:"User is Blocked by admin",errorMsg:''})
        }

        if (findUser.isGoogleUser===true) {
            return res.render('user/login', { 
                message: "This account uses Google Sign-In only. Please login with Google.",
                errorMsg: ''
            });
        }
        const passportMatch = await bcrypt.compare(password,findUser.password)

        if(!passportMatch){
            return res.render('user/login',{message:"Incorrect Password",errorMsg:''})
        }

        req.session.user = {
            _id:findUser._id,
            name:findUser.name,
            email:findUser.email,
        }
        res.redirect('/')

    } catch (error) {
        console.error("login error",error);
        res.render('user/login',{message:"Login Failed ,Please try again later",errorMsg:''})
        
    }
}
const logout = async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log('Session destruction error',err.message);
                return res.redirect('/pageNotFound')
            }
            res.clearCookie('connect.sid')
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

        const sortType = req.query.sort || ''
        let sortQuery = {}

        if(sortType ==='az'){
            sortQuery ={productName:1}
        }else if(sortType ==='za'){
            sortQuery ={productName:-1}
        }else if(sortType ==='low-high'){
            sortQuery ={salesPrice:1}
        }else if(sortType ==='high-low'){
            sortQuery ={salesPrice:-1}
        }else{
            sortQuery ={createdAt:-1} // for  lateset products as defualt
        }



        const products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds},
            // quantity:{$gt:0},
            variants: { $elemMatch: { stock: { $gt: 0 } } }

        })
        .collation({ locale: "en", strength: 2 }) 
        .sort(sortQuery).skip(skip).limit(limit)

        const totalProducts = await Product.countDocuments({
            isBlocked:false,
            category:{$in:categoryIds},
            // quantity:{$gt:0},
            variants: { $elemMatch: { stock: { $gt: 0 } } }
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
            sort:sortType,
            selectedCategory:null,
            selectedBrand:null,
            selectedPrice: null,
            crumbs: [
                        { label: "Home", url: "/" },
                        { label: "Shop", url: "/shop" }
                    ]
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
            // quantity:{$gt:0},
            variants: { $elemMatch: { stock: { $gt: 0 } } }
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
            crumbs: [
                        { label: "Home", url: "/" },
                        { label: "Shop", url: "/shop" }
                    ]
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
            // quantity:{$gt:0},
            variants: { $elemMatch: { stock: { $gt: 0 } } }

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
            crumbs: [
                        { label: "Home", url: "/" },
                        { label: "Shop", url: "/shop" }
                    ]
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
                // quantity:{$gt:0},
                variants: { $elemMatch: { stock: { $gt: 0 } } },
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
            crumbs: [
                        { label: "Home", url: "/" },
                        { label: "Shop", url: "/shop" }
                    ]
        })



    } catch (error) {
        console.log('Error in filterByPrice',error)
        res.redirect('/pageNotFound')
    }
}

const loadShop = async(req,res)=>{
    try {   
        const user = req.session.user
        // if(!user)return res.redirect('/login')
        const userData = user? await User.findById(user):null
        const category =req.query.category? req.query.category.trim() : null
        const brand = req.query.brand? req.query.brand.trim() : null
        const { 
            search,
            sort,
            page=1, 
            gt,
            lt
        } = req.query

        const limit =9
        const skip =(page-1)*limit

        let query = {
            isBlocked:false,
            // quantity:{$gt:0},
            variants: { $elemMatch: { stock: { $gt: 0 } } },
        }

        if(category){
            query.category = category
        }
        if(brand){
            const findBrand = await Brand.findById(brand)
            if(findBrand){
                query.brand = findBrand.brandName
            }
        }
        if(gt||lt){
            query.salesPrice = {
                $gt:parseFloat(gt)||0,
                $lt:parseFloat(lt)||1000000
            }
        }

        if(search){
            query.productName = {$regex:'.*'+search+'.*',$options:'i'}
        }
        let sortQuery = {}

        if(sort==='az')sortQuery ={productName:1}
        else if(sort==='za')sortQuery ={productName:-1}
        else if(sort==='low-high')sortQuery ={salesPrice:1}
        else if(sort==='high-low')sortQuery ={salesPrice:-1}
        else sortQuery ={createdAt:-1} // for  lateset products as defualt

        const products = await Product.find(query)
        .collation({ locale: "en", strength: 2  }) 
        .sort(sortQuery).skip(skip).limit(limit).lean()

        const totalProducts = await Product.countDocuments(query)
        const totalPages = Math.ceil(totalProducts/limit)

        const categories = await Category.find({isListed:true}).lean()
        const brands = await Brand.find({isBlocked:false}).lean()

        let wishlistProducts = []
        if(user){
            let userId = user._id
            const wishlist = await WishLish.findOne({userId})
            wishlistProducts = wishlist ? wishlist.products : [];
            console.log('==>',wishlistProducts)
        }


        res.render('user/shop',{
            user:userData,
            products,
            category:categories,
            brand:brands,   
            totalProducts,
            currentPage:parseInt(page),
            totalPages,
            wishlist:wishlistProducts,
            selectedBrand:brand||null,
            selectedCategory:category||null,
            selectedPrice:{gt,lt}||null,
            searchQuery:search||'',
            sort,
            crumbs: [
                        { label: "Home", url: "/" },
                        { label: "Shop", url: "/shop" }
                    ]
        })



         
    }       
    catch (error) {     
        console.log('Error in loadShop',error)  
        res.redirect('/pageNotFound')
    }
}


export {
    loadHomePage,
    loadSignUp,
    signup,
    getVerifyOtp,
    verifyOtp,
    resendOtp,
    loadlogin,
    login,
    logout,
    pageNotFound,
    loadShoppingPage,
    filterProduct,
    filterByPrice,
    searchProducts,
    loadShop
}