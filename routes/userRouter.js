const express = require('express')
const router = express.Router()
const{loadHomePage,loadSignUp,signup,verifyOtp,resendOtp,pageNotFound,
    loadlogin,login,logout ,loadShoppingPage,filterProduct,filterByPrice,searchProducts
} = require('../controllers/user/userController')
const {getForgotPassPage, forgotEmailValid ,verifyForgotPassOtp,getResetPassPage,
    resendForgotOtp,postNewPassword, userProfile
} = require('../controllers/user/profileController')
const {userAuth, adminAuth} =require('../middleware/auth')
const {productDetails} = require('../controllers/user/productController')
const passport = require('passport')


//home 
router.get('/',(req,res,next)=>{
    console.log(req.session);
    next()
},loadHomePage)
//shopping management
router.get('/shop',userAuth,loadShoppingPage)
router.get('/filter',userAuth,filterProduct)
router.get('/filterPrice',userAuth,filterByPrice)
router.post('/search',userAuth,searchProducts)
//signup 
router.get('/signup',loadSignUp)
router.post("/signup",signup)
router.post('/verify-otp',verifyOtp)
router.post('/resend-otp',resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback', passport.authenticate('google',{failureRedirect:'/sigup'}),(req,res)=>{
    res.redirect('/')
})
//login
router.get('/login',loadlogin)
router.post('/login',login)
router.get('/logout',logout)
//Error page
router.get('/pageNotFound',pageNotFound)
//profile management
router.get('/forgot-password',getForgotPassPage)
router.post('/forgot-email-password',forgotEmailValid)
router.post('/verify-passforgot-otp',verifyForgotPassOtp)
router.get('/reset-password',getResetPassPage)
router.post('/resend-passforgot-otp',resendForgotOtp)
router.post('/reset-password',postNewPassword)
router.get('/userProfile',userAuth,userProfile)

//product management
router.get('/productDetails',userAuth,productDetails)



module.exports= router