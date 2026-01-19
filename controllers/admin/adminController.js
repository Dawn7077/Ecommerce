// const User = require('../../models/userSchema')
// const Order = require('../../models/orderSchema')
// const mongoose = require('mongoose')
// const bcrypt = require('bcrypt')
// const Category = require('../../models/categorySchema')
// const Product = require('../../models/productSchema')
// const Brand = require('../../models/brandSchema')

import User from '../../models/userSchema.js'
import Order from '../../models/orderSchema.js'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import Category from '../../models/categorySchema.js'
import Product from '../../models/productSchema.js'
import Brand from '../../models/brandSchema.js'
import StatusCodes from '../../utils/httpStatus.js'
import  {
    calculateOrderNetAmount,
    calculateStats,
    getDateFilter
} from '../../utils/dashbordUtils.js'


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
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error. Please try again."
        });
        
    }
}
//dashboard controllers


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
        console.log(error)
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Sales timeline error" })
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


    
    
export {
    loadlogin,
    login,
    loadDashboard,
    getLoadDashboard,
    getSalesTimeline,
    pageError,
    logout
}