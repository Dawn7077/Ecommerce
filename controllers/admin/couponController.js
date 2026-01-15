import Coupon from '../../models/couponSchema.js'
import mongoose from 'mongoose'

const loadCoupon = async(req,res)=>{
    try {
        const findCoupon = await Coupon.find({})

        return res.render('admin/coupon',{coupons:findCoupon})
    } catch (error) {
        res.redirect('/pageError')
    }
}
const createCoupon = async(req,res)=>{
    try { 
        const data = {
            couponName:req.body.couponName,
            startDate:new Date(req.body.startDate +"T00:00:00"),
            endDate:new Date(req.body.endDate +"T00:00:00"),
            offerPrice:parseInt(req.body.offerPrice),
            minimumPrice:parseInt(req.body.minimumPrice), 
        }

        const newCoupon = new Coupon({
            name:data.couponName.toUpperCase(),
            createdOn:data.startDate,
            expireOn:data.endDate,
            offerPrice:data.offerPrice,
            minimumPrice:data.minimumPrice
        })
        await newCoupon.save()

        return res.redirect('/admin/coupon')

    } catch (error) {
        res.redirect('/pageError')
    }
}

const getEditCoupon = async(req,res)=>{
    try {
         const id = req.params.id
         const findCoupon = await Coupon.findOne({_id:id}) 
        return res.render('admin/editCoupon',{
            findCoupon:findCoupon
        })
    } catch (error) {
        res.redirect('/pageError')
    }
}
const editCoupon = async(req,res)=>{
    try {
        const couponId = req.body.couponId   
        const startDate = new Date(req.body.startDate)
        const endDate = new Date(req.body.endDate) 
        const updateCoupon = await Coupon.findByIdAndUpdate({
            _id:couponId
        },
        {$set:{
            name:req.body.couponName,
            createdOn:startDate,
            expireOn:endDate,
            offerPrice:parseInt(req.body.offerPrice),
            minimumPrice:parseInt(req.body.minimumPrice),
        }},{new:true})
        if(updateCoupon!==null){
                res.send('Coupon updated successfully')
        }else{
            res.status(500).send('Coupon updated Failed')
        }
         
         
    } catch (error) {
        res.redirect('/pageError')
    }
}
const editCoupon1 = async(req,res)=>{
    try {
        const couponId = req.body.couponId
        const findCoupon = await Coupon.findOne({_id:couponId}) 
        const oid = new mongoose.Types.ObjectId(couponId)
        const selectedCoupon = await Coupon.findOne({_id:oid})
        if(selectedCoupon){
            const startDate = new Date(req.body.startDate)
            const endDate = new Date(req.body.endDate)
            const updateCoupon = await Coupon.updateOne({
                _id:oid
            },
            {$set:{
                name:req.body.couponName,
                createdOn:startDate,
                expireOn:endDate,
                offerPrice:parseInt(req.body.offerPrice),
                minimumPrice:parseInt(req.body.minimumPrice),
            }},{new:true})
            if(updateCoupon!==null){
                 res.send('Coupon updated successfully')
            }else{
                res.status(500).send('Coupon updated Failed')
            }
        }
         
    } catch (error) {
        res.redirect('/pageError')
    }
}

const deleteCoupon = async(req,res)=>{
    try {
        const couponId = req.params.id
        const deletedCoupon = await Coupon.findByIdAndDelete(couponId)
        if(!deletedCoupon){
            return res.status(404).send({success:false,message:'coupon not found'})
        }
 
        res.status(200).send({success:true,message:'coupon deleted successfully'})
    } catch (error) { 
        console.log('error deleting coupon',error)
        res.status(500).send({success:false,message:'coupon deleted failed'})
    }
}


export {
    loadCoupon,
    createCoupon,
    getEditCoupon,
    editCoupon,
    deleteCoupon
}