const express = require('express')
const router = express.Router()
const{loadHomePage,loadSignUp,signup,verifyOtp,resendOtp,pageNotFound,
    loadlogin,login,logout ,loadShoppingPage,filterProduct,filterByPrice,searchProducts,loadShop
} = require('../controllers/user/userController')
const {getForgotPassPage, forgotEmailValid ,verifyForgotPassOtp,getResetPassPage,
    resendForgotOtp,postNewPassword, userProfile
} = require('../controllers/user/profileController')
const {userAuth, adminAuth,isloggedOut} =require('../middleware/auth')
const {productDetails} = require('../controllers/user/productController')
const passport = require('passport')


//home 
router.get('/',(req,res,next)=>{
    console.log(req.session);
    next()
},loadHomePage)


//shopping management
router.get('/shop', loadShop)
// router.get('/shop', loadShoppingPage)
// router.get('/filter',userAuth,filterProduct)
// router.get('/filterPrice',userAuth,filterByPrice)
// router.post('/search',userAuth,searchProducts)


//signup 
router.get('/signup',isloggedOut,loadSignUp)
router.post("/signup",signup)
router.post('/verify-otp',verifyOtp)
router.post('/resend-otp',resendOtp)
router.get('/auth/google',isloggedOut,passport.authenticate('google',{scope:['profile','email']}))
// router.get('/auth/google/callback', passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
//     console.log(req.user)
//     req.session.user={
//         _id:req.user._id,// where is this req.user getting is it from the google after auth or from the login.ejs user form 
//         name:req.user.name,
//         email:req.user.email,
//         isGoogleEmail:true
//     }
//     res.redirect('/')
// })
router.get('/auth/google/callback',isloggedOut, (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
        // console.log(req)
        if (err) return next(err);
 
        if (!user) { 
            const msg = info?.message || "Google login failed";
            return res.redirect('/login?errorMsg=' + encodeURIComponent(msg));
        } 

        req.logIn(user, (err) => {
            if (err) return next(err);

            req.session.user = {
                _id: user._id,
                name: user.name,
                email: user.email,
                isGoogleEmail: true
            };
            return res.redirect('/');
        });
    })(req, res, next);
});


//login
router.get('/login',isloggedOut,loadlogin)
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
router.get('/productDetails',productDetails)
 


module.exports= router