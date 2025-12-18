const express = require('express')
const router = express.Router()
const{loadHomePage,loadSignUp,signup,getVerifyOtp,verifyOtp,resendOtp,pageNotFound,
    loadlogin,login,logout ,loadShoppingPage,filterProduct,filterByPrice,searchProducts,loadShop
} = require('../controllers/user/userController')
const {getForgotPassPage, forgotEmailValid ,verifyForgotPassOtp,getResetPassPage,
    resendForgotOtp,postNewPassword, userProfile,getChangeEmail,changeEmailValid,verifyEmailOtp,
    updateEmail,getChangePassword,changePasswordValid,verifyPasswordOtp,getAddAddress,addAddress,
    getEditAddress,editAddress,deleteAddress
} = require('../controllers/user/profileController')
const {userAuth, adminAuth,isloggedOut} =require('../middleware/auth')
const {productDetails} = require('../controllers/user/productController')
const passport = require('passport')
const {loadWishlist,addToWishlist,removeProduct,deleteWishlist} = require('../controllers/user/wishlistController')


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
router.get('/verify-otp',isloggedOut,getVerifyOtp)
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
router.get('/user-profile',userAuth,userProfile)
router.get('/forgot-password',getForgotPassPage)
router.post('/forgot-email-password',forgotEmailValid)
router.post('/verify-passforgot-otp',verifyForgotPassOtp)
router.get('/reset-password',getResetPassPage)
router.post('/resend-passforgot-otp',resendForgotOtp)
router.post('/reset-password',postNewPassword)
router.get('/change-email',userAuth,getChangeEmail)
router.post('/change-email',userAuth,changeEmailValid)
router.post('/verify-email-Otp',userAuth,verifyEmailOtp)
router.post('/update-email',userAuth,updateEmail)
router.get('/change-password',userAuth,getChangePassword)
router.post('/change-password',userAuth,changePasswordValid)
router.post('/verify-changepassword-otp',userAuth,verifyPasswordOtp)

//address management
router.get('/add-address',userAuth,getAddAddress)
router.post('/add-address',userAuth,addAddress)
router.get('/edit-address',userAuth,getEditAddress)
router.post('/edit-address',userAuth,editAddress)
router.get('/delete-address',userAuth,deleteAddress)

//product management
router.get('/productDetails',productDetails)

//wishLish
router.get('/wishlist',userAuth,loadWishlist)
router.post('/add-to-wishlist',userAuth,addToWishlist)
router.get('/remove-from-wishlist',userAuth,removeProduct)
router.delete('/delete-wishlist',userAuth,deleteWishlist)


const {loadCart,addToCart,updateCart,deleteItemCart,deleteCart,variantData} =require('../controllers/user/cartController')
//cart management
router.get('/cart',userAuth,loadCart)
router.get('/product-variants/:id',userAuth,variantData)
router.post('/add-to-cart',userAuth,addToCart)
router.put('/product-update-cart',userAuth,updateCart)
router.delete('/product-delete-cart/:productId',userAuth,deleteItemCart)
router.delete('/delete-cart',userAuth,deleteCart)

//checkout management
const {getCheckout,addNewAddress,updateAddress,deleteCheckoutAddress,applyCoupon,
    removeCoupon,placeorder,createStripeSession,stripeSuccess,stripeCancel,orderSuccessPage,orderFailedPage,
    retryCancelledOrder,getOrderDetailsForRetry
} = require('../controllers/user/checkoutController')

router.get('/checkout/:id',userAuth,getCheckout)
router.post('/add-new-address',userAuth,addNewAddress)
router.put('/edit-address/:id',userAuth,updateAddress)
router.delete('/delete-address/:id',userAuth,deleteCheckoutAddress)
router.post('/apply-coupon',userAuth,applyCoupon)
router.post('/remove-coupon',userAuth,removeCoupon)
router.post('/checkout-placeorder',userAuth,placeorder) 

router.post('/payment/stripe/create-session',createStripeSession);
router.get('/payment/stripe/success', stripeSuccess);
router.get('/payment/stripe/cancel', stripeCancel);

router.get('/order/success',userAuth,orderSuccessPage)
router.get('/order/failed', userAuth, orderFailedPage);

router.get('/retry-order-details/:id',userAuth,getOrderDetailsForRetry)
router.post('/retry-cancelled-order',userAuth,retryCancelledOrder)


//soft delete
//orders management
const {loadOrderPage,getUserOrders,getOrderDetails,cancelOrder,requestReturn,generateOrderInvoice} =require('../controllers/user/orderController')
router.get('/order',userAuth,getUserOrders)
router.get('/order/:id',userAuth,getOrderDetails)
router.post('/cancel-order/:id',userAuth,cancelOrder)
router.post('/return-order/:id',userAuth,requestReturn)
router.get('/order-invoice/:id', userAuth, generateOrderInvoice);

//wallet management  
const {getWallet,addWalletMoney,stripeWalletSuccess,stripeWalletCancel,} = require('../controllers/user/walletController')
router.get('/wallet',userAuth,getWallet)
router.post('/wallet/add-money',userAuth,addWalletMoney)
router.get('/wallet/stripe-success',userAuth,stripeWalletSuccess)
router.get('/wallet/stripe-cancel',userAuth,stripeWalletCancel)


module.exports= router