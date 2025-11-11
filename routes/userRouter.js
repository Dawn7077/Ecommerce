const express = require('express')
const router = express.Router()
const{loadHomePage,loadSignUp,signup,verifyOtp,resendOtp,pageNotFound,
    loadlogin,login,logout
} = require('../controllers/user/userController')
const passport = require('passport')

router.get('/',(req,res,next)=>{
    console.log(req.session);
    next()
},loadHomePage)
router.get('/signup',loadSignUp)
router.post("/signup",signup)
router.post('/verify-otp',verifyOtp)
router.post('/resend-otp',resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback', passport.authenticate('google',{failureRedirect:'/sigup'}),(req,res)=>{
    res.redirect('/')
})
router.get('/login',loadlogin)
router.post('/login',login)
router.get('/logout',logout)

router.get('/pageNotFound',pageNotFound)
module.exports= router