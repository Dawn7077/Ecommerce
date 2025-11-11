//adminRouter
const express = require('express')
const router = express.Router()
const multer = require('multer')
const storage = require('../helpers/multer')
const uploads = multer({storage:storage})

const {getBrandPage,addBrand,blockBrand,unBlockBrand,deleteBrand} = require('../controllers/admin/brandController')
const {loadlogin, login,loadDashboard,pageError,
    logout,
} = require('../controllers/admin/adminController')
const {customerInfo,customerBlocked,customerUnBlocked} = require('../controllers/admin/customerController')
const {categoryInfo,addCategory, addCategoryOffer, removeCategoryOffer, getListCategory,getUnlistCategory,getEditCategory, editCategory
 } = require('../controllers/admin/categoryController') 
const {userAuth, adminAuth} =require('../middleware/auth')
const {getProductAddPage,addProducts} =require('../controllers/admin/productController')


//error management
router.get('/pageError',pageError)
//login mangamnet
router.get('/login',loadlogin)
router.post('/login',login)
router.get('/dashboard',adminAuth,loadDashboard)
router.get('/logout',logout)
//customer management
router.get('/users',adminAuth,customerInfo)
router.get('/blockCustomer',adminAuth,customerBlocked)
router.get('/unBlockCustomer',adminAuth,customerUnBlocked)
//category management
router.get('/category',adminAuth,categoryInfo)
router.post('/addCategory',adminAuth,addCategory)
router.post('/addCategoryOffer',adminAuth,addCategoryOffer)
router.post('/removeCategoryOffer',adminAuth,removeCategoryOffer)
router.get('/listCategory',adminAuth,getListCategory)
router.get('/unlistCategory',adminAuth,getUnlistCategory)
router.get('/editCategory',adminAuth,getEditCategory)
router.post('/editCategory/:id',adminAuth,editCategory)
//brand management
router.get('/brands',adminAuth,getBrandPage)
router.post('/addBrand',adminAuth,uploads.single("image"),addBrand)
router.get('/blockBrand',adminAuth,blockBrand)
router.get('/unBlockBrand',adminAuth,unBlockBrand)
router.get('/deleteBrand',adminAuth,deleteBrand)
//product management
router.get('/addProducts',adminAuth,getProductAddPage)
router.post('/addProducts',((req,res,next)=>{
    console.log("/addProducts has recieved a post req");
    next()
    
}),adminAuth,uploads.array('images',4),addProducts)

module.exports = router