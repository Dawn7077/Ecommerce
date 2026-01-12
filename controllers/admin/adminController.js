const User = require('../../models/userSchema')
const Order = require('../../models/orderSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Brand = require('../../models/brandSchema')

const loadlogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect('/admin/dashboard')
    }
    res.render('admin/login',{message:null})
    
}

const login= async(req,res)=>{
    try {
        const {password,email}=req.body 
        const admin =await User.findOne({email,isAdmin:true})


        if(!admin){
            return res.json({
                success:false,
                message:"This is not a admin account"
            })
        }else{
            const passwordMatch = await bcrypt.compare(password,admin.password)
            if(passwordMatch){ 
                req.session.admin= {
                    _id:admin._id,
                    name:admin.name,
                    email:admin.email
                }
                // return res.redirect('/admin/dashboard')
                return res.json({ 
                    success:true,
                    redirectUrl:'/admin/dashboard'
                })
            }else{//password not match
                // return res.redirect('/admin/login')
                return res.json({
                    success:false,
                    message:"Invalid email or password"
                })
            }
        } 

    } catch (error) {
        console.log("login Error",error);
        // return res.redirect('/pageError')
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again."
        });
        
    }
}
//dashboard controllers
function getDateFilter(type,value){
    let start,end
    const now = new Date()

    if(value){
        if(type === 'yearly'){
            start = new Date(value,0,1,0,0,0)
            end = new Date(value,11,31,23,59,59)
        }

        else if(type === 'monthly'){
            const year = now.getFullYear()
            start = new Date(year,value-1,1,0,0,0)
            end = new Date(year,value,0,23,59,59)
        }else{ 
            start = new Date()
            end = new Date()
            start.setDate(end.getDate()- 30)
        } 
    }else{
        if (type === 'daily') {
            start = new Date(now)
            start.setHours(0,0,0,0)

            end = new Date(now)
            end.setHours(23,59,59,999)
        }

        else if (type === 'monthly') { 
            start = new Date(now.getFullYear(),now.getMonth(),1)
            end = new Date(now.getFullYear(),now.getMonth() + 1,0,23,59,59,999)
        }

        else if (type === 'yearly') {
            start = new Date(now.getFullYear(),0,1)
            end = new Date(now.getFullYear(),11,31,23,59,59,999)
        }

        else { 
            start = new Date()
            start.setDate(now.getDate() - 30)
            end = now
        }
    }

    
    return { $gte:start , $lte:end }
}

const loadDashboard = async (req,res)=>{
    if(req.session.admin){
        try {
            const filterType = req.query.filterType || ''
            const value = req.query.value || ''
            const dateFilter = getDateFilter(filterType,value)

            const totalUsers = await User.countDocuments()
            const totalProducts = await Product.countDocuments()
            const totalOrders = await Order.countDocuments()

            const revenueData = await Order.aggregate([
                {
                    $match:{
                        createdAt: dateFilter, 
                        paymentStatus:{$in:['Paid','Completed']}
                    }
                },
                {$unwind:"$orderedItems"},
                {
                    $match:{
                        "orderedItems.status":"Delivered"
                    }
                },
                {
                    $addFields:{
                        itemTotal:{
                            $multiply:["$orderedItems.price","$orderedItems.quantity"]
                        }
                    }
                }, 
                {
                    $addFields:{
                        itemProportion:{
                            $cond:[
                                {$gt:["$subtotal",0]},
                                {$divide:["$itemTotal","$subtotal"]},
                                0
                            ]
                        }
                    }
                },

                {
                    $addFields:{
                        itemDiscount:{
                            $multiply:[
                                {$ifNull:["$discount",0]},
                                "$itemProportion"
                            ]
                        },
                        itemCouponDiscount:{
                            $cond:[
                                "$couponApplied",
                                {
                                    $multiply:[
                                        { $ifNull:["$couponDiscount",0]},
                                        "$itemProportion"
                                    ]
                                },
                                0
                            ]
                        }
                    }
                },

                {
                    $addFields:{
                        itemRevenue:{
                            $subtract:[
                                "$itemTotal",
                                {$add :["$itemDiscount","$itemCouponDiscount"]}
                            ]
                        }
                    }
                },

                {
                    $group:{
                        _id:null,
                        totalRevenue:{$sum : "$itemRevenue"}
                    }
                }
            ])

            const totalRevenue = revenueData.length>0 ? revenueData[0].totalRevenue : 0


            //  Calculate Net Sales -------------------
            
            const orders = await Order.find({ createdAt: dateFilter });
            const stats = calculateStats(orders);
            const netSales = +stats.totalSales;
                
            // ----------------------------     

            console.log('totalRevenue',totalRevenue,netSales)

            const topProducts = await Order.aggregate([
                {$match:{
                    createdAt:dateFilter
                }},
                {$unwind:"$orderedItems"},
                {$match:{
                    "orderedItems.status":"Delivered"
                }},
                {$group:{
                    _id:"$orderedItems.product",
                    totalSold:{$sum:"$orderedItems.quantity"}
                }},
                {$sort:{totalSold:-1}},
                {$limit:10},
                {$lookup:{
                    from:"products",
                    localField:"_id",
                    foreignField:"_id",
                    as:"product"
                }},
                {$unwind:"$product"}
            ])

            const topCategories = await Order.aggregate([
                {$match:{ createdAt:dateFilter }},
                {$unwind:"$orderedItems"},
                {$match:{
                    "orderedItems.status":"Delivered"
                }},
                {$group:{
                    _id:"$orderedItems.category",
                    totalSold:{$sum:"$orderedItems.quantity"}
                }},
                {$sort:{totalSold:-1}},
                {$limit:10},
                {$lookup:{
                    from:"categories",
                    localField:"_id",
                    foreignField:"_id",
                    as:"category"
                }},
                {$unwind:"$category"}
            ])

            const topBrands = await Order.aggregate([
                {$match:{
                    // status:"Delivered",
                    createdAt:dateFilter
                }},
                {$unwind:"$orderedItems"},
                {$match:{
                    "orderedItems.status":"Delivered"
                }},
                {$group:{
                    _id:"$orderedItems.brand",
                    totalSold:{$sum:"$orderedItems.quantity"}
                }},
                {$sort:{totalSold:-1}},
                {$limit:10}
            ])
            console.log(topBrands)
            res.render('admin/dashboard',{
                totalUsers, totalProducts,totalOrders,totalRevenue,netSales,
                topProducts,
                topCategories,
                topBrands
            })
        } catch (error) {
            console.log(error)
            res.redirect('/admin/pageError')
        }
    }else{
        res.redirect('/admin/login')
    }
}

const getLoadDashboard =  async (req,res)=>{
    if(req.session.admin){
        try {
            const filterType = req.query.filterType || 'daily'
            const value = req.query.value || null
            const dateFilter = getDateFilter(filterType,value)
            console.log(filterType,dateFilter)

            const topProducts = await Order.aggregate([
                {$match:{
                    createdAt:dateFilter
                }},
                {$unwind:"$orderedItems"},
                {$match:{
                    "orderedItems.status":"Delivered"
                }},
                {$group:{
                    _id:"$orderedItems.product",
                    totalSold:{$sum:"$orderedItems.quantity"}
                }},
                {$sort:{totalSold:-1}},
                {$limit:10},
                {$lookup:{
                    from:"products",
                    localField:"_id",
                    foreignField:"_id",
                    as:"product"
                }},
                {$unwind:"$product"}
            ])

            const topCategories = await Order.aggregate([
                {$match:{ createdAt:dateFilter }},
                {$unwind:"$orderedItems"},
                {$match:{
                    "orderedItems.status":"Delivered"
                }},
                {$group:{
                    _id:"$orderedItems.category",
                    totalSold:{$sum:"$orderedItems.quantity"}
                }},
                {$sort:{totalSold:-1}},
                {$limit:10},
                {$lookup:{
                    from:"categories",
                    localField:"_id",
                    foreignField:"_id",
                    as:"category"
                }},
                {$unwind:"$category"}
            ])

            const topBrands = await Order.aggregate([
                {$match:{ 
                    createdAt:dateFilter
                }},
                {$unwind:"$orderedItems"},
                {$match:{
                    "orderedItems.status":"Delivered"
                }},
                {$group:{
                    _id:"$orderedItems.brand",
                    totalSold:{$sum:"$orderedItems.quantity"}
                }},
                {$sort:{totalSold:-1}},
                {$limit:10}
            ])




            res.json({
                products:{
                    labels:topProducts.map(p=> p.product.productName),
                    values:topProducts.map(p=> p.totalSold),
                },
                categories:{
                    labels:topCategories.map(c=> c.category.name),
                    values:topCategories.map(c=> c.totalSold),
                },
                brands:{
                    labels:topBrands.map(b=> b._id),
                    values:topBrands.map(b=> b.totalSold)
                }
            })
        } catch (error) {
            console.log(error)
            res.redirect('/admin/pageError')
        }
    }else{
        res.redirect('/admin/login')
    }
}

const getSalesTimeline = async(req,res)=>{
    try {
        const filterType = req.query.filterType || 'monthly'
        const dateFilter = getDateFilter(filterType)
        
        let groupStage = {}
        let labels = []

        if(filterType === 'daily'){
            // groupStage = {hour:{$hour:'$createdAt'}}
            labels = Array.from({length:24},(_,i)=>`${i}:00`)
        }

        if(filterType === 'monthly'){
            // groupStage = {day:{$dayOfMonth:'$createdAt'}} 

            const daysInMonth = new Date(
                new Date().getFullYear(),
                new Date().getMonth()+1,
                0
            ).getDate()

            labels = Array.from({ length:daysInMonth},(_,i)=> `Day ${i+1}`)
        }

        if(filterType === 'yearly'){
            // groupStage = {month:{$month:'$createdAt'}}
            labels = ['Jan','Feb','Mar','Apr','May',"Jun","Jul",'Aug','Sep','Oct','Nov','Dec']
        }



        const sales = await Order.aggregate([
            {
                $match:{
                    status:'Delivered',
                    createdAt:dateFilter
                }
            },
            {
                $group:{
                    _id:
                    filterType === 'daily' ?{$hour:'$createdAt'}:
                        filterType === 'monthly'?{$dayOfMonth:'$createdAt'}:{ $month: '$createdAt' },
                    totalSales:{$sum:"$finalAmount"}
                }
            },
            {$sort:{"_id":1}}
        ])

        const map = {}
        sales.forEach(s=>{ 
            map[s._id] = s.totalSales
        })

        let values

        if(filterType === 'daily' ){
            values = labels.map((_,i)=> map[i] || 0)
        }
        else {
            values = labels.map((_, i) => map[i + 1] || 0)
        }


        res.json({labels,values})

    } catch (error) {
        console.log(err)
        res.status(500).json({ error: "Sales timeline error" })
    }
}

const pageError = async(req,res)=>{
    res.render('admin/admin-error')
}

const logout =async(req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying the session",err);
                res.redirect('/pageError')
            }
            res.clearCookie('connect.sid')
            res.redirect('/admin/login')
        }) 
    } catch (error) {
        console.log("Unexpected error during logout",error);
        res.redirect('/pageError')
    }
}


function calculateOrderNetAmount(order) { 
    const activeItemsTotal = order.totalPrice || 1; 
    const couponRatio = (order.couponDiscount || 0) / activeItemsTotal;

    let netAmount = 0;
    const isPrepaid = ['Wallet', 'Stripe'].includes(order.paymentMethod);
    order.orderedItems.forEach(item => {
        const isSold =(isPrepaid && ['Paid', 'Completed'].includes(order.paymentStatus)) || item.status === 'Delivered';

        // if (isSold && !item.refunded && item.status !== 'Cancelled') {
        if (isSold && !item.refunded ) {
            const itemBaseValue = item.price * item.quantity;
            const itemCouponShare = itemBaseValue * couponRatio;
            netAmount += (itemBaseValue - itemCouponShare);
        }
    });
 
    // if (netAmount > 0) {
    if (netAmount > 0 && order.finalAmount > 0) {
        const shipping = (order.finalAmount - (order.totalPrice - order.couponDiscount));
        netAmount += shipping;
    }

    return +netAmount.toFixed(2);
}

function calculateStats(orders) {
    let stats = {
        totalOrders: 0,
        totalSales: 0,
        totalOrderAmount: 0,
        totalCancelled: 0,
        totalRefunded: 0,
        totalDiscount: 0,  
        totalCouponDiscount: 0
    };

    orders.forEach(order => {
        const orderNet = calculateOrderNetAmount(order);
        if (orderNet > 0) {
            stats.totalOrders++;
            stats.totalSales += orderNet;
        }
 
        stats.totalDiscount += (order.discount || 0);
        stats.totalCouponDiscount += (order.couponDiscount || 0);
        stats.totalOrderAmount += (order.finalAmount || 0);
 
        const activeItemsTotal = order.totalPrice || 1;
        const couponRatio = (order.couponDiscount || 0) / activeItemsTotal;

        order.orderedItems.forEach(item => {
            const itemBaseValue = item.price * item.quantity;
            const itemCouponShare = itemBaseValue * couponRatio;
            const itemActualPaidValue = itemBaseValue - itemCouponShare;

            if (item.status === 'Cancelled') {
                stats.totalCancelled += itemActualPaidValue;
            }
            if (item.refunded) {
                stats.totalRefunded += itemActualPaidValue;
            }
        });
    });
 
    for (let key in stats) {
        if (key !== 'totalOrders') stats[key] = stats[key].toFixed(2);
    }
    return stats;
}

    
    
module.exports= {
    loadlogin,
    login,
    loadDashboard,
    getLoadDashboard,
    getSalesTimeline,
    pageError,
    logout
}