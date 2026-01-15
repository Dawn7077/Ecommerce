// const User =require('../../models/userSchema')
// const Address = require('../../models/addressSchema')
// const Wallet = require('../../models/walletSchema')
// const nodemailer = require('nodemailer')
// const bcrypt = require('bcrypt')
// const env = require('dotenv')
// const session = require('express-session')
// const user = require('../../../UserManageApp/model/user')

import User from '../../models/userSchema.js'
import Address from '../../models/addressSchema.js'
import Wallet from '../../models/walletSchema.js'
import nodemailer from 'nodemailer'
import bcrypt from 'bcrypt'
import dotenv  from 'dotenv' 
dotenv.config()


const securePassword = async(password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) { 
        console.log(error)
    }
}

function generateOtp (){
    const digits = '1234567890'
    let otp=''
    for(let i=0; i<6;i++){
        otp+= digits[Math.floor(Math.random()*10)]
    }
    return otp
}
 
const sendVerification = async(email,otp)=>{
    try { 
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD,

            }
        })

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to:email,
            subject:'Your OTP for Password reset',
            text:`Your OTP is ${otp}`,
            html:`<br><h4>Your OTP: ${otp} </h4></br>`
        }

        const info = await transporter.sendMail(mailOptions)
        console.log('Email sent:',info.messageId);
        return true
          
    } 
    catch (error) {
         console.error('Error sending email ',error);
        return false 
    }
}

const getForgotPassPage = async(req,res)=>{
    try {
        res.render('user/forgot-password')
    } catch (error) {
        console.log(error)
        res.redirect("/pageNotFound")
    }
}
const forgotEmailValid = async(req,res)=>{
    try { 
        const {email } = req.body
        const findUser = await User.findOne({email})
        if(findUser){
            const otp = generateOtp()
            const emailSent = await sendVerification(email,otp)
            if(emailSent){
                req.session.userOtp = otp
                req.session.email = email
                res.render('user/forgotPass-otp')
                console.log('OTP',otp);
                
            }else{
                res.json({success:false,message:'Failed to sent OTP,Please try again'})
            }
        }else{
            res.render('user/forgot-password',{
                message:'user with this mail dose not exist '
            })
        }
    } catch (error) { 
        console.log(error)
        res.redirect("/pageNotFound")
    }
}

const verifyForgotPassOtp = async(req,res)=>{
    try {
         const enteredOtp = req.body.otp
         if(enteredOtp === req.session.userOtp){
            res.json({success:true,redirectUrl:'/reset-password'})
         }else{
            res.json({success:false,message:'Otp not matching'})
         }
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:'An error occured ,Please try again'})
    }
}

const getResetPassPage = async(req,res)=>{
    try {
        res.render('user/reset-password')
    } catch (error) {
        console.log(error)
        res.redirect("/pageNotFound")
    }
}

const resendForgotOtp = async(req,res)=>{
    try {
        const otp = generateOtp()
        req.session.userOtp = otp
        const email =req.session.email
        console.log('Resending Otp to email:',email);
        const emailSent = await sendVerification(email,otp)
        if(emailSent){
            console.log("Resend Otp:",otp);
            res.status(200).json({success:true,message:'Resend Otp Successfully'})
            
        }
        
    } catch (error) {
        console.error('error in resentOTp', error) 
        res.status(500).json({success:false,message:'Internal server error'})
    }
}

const postNewPassword = async(req,res)=>{
    try {
        const {newPass1,newPass2} = req.body
        const email =req.session.email
        if(newPass1 === newPass2){
            const passwordHash = await securePassword(newPass1)
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect("/login")
        }else{
            res.render('user/reset-password',{message:'passwords donot match'})
        }

    } catch (error) {
        console.log(error)
        res.redirect("/pageNotFound")
    }
}


const userProfile = async(req,res)=>{
    try {
        // console.log('>>>>',req.session.user);
        const userId = req.session.user._id
        const userData = await User.findById(userId)
        const addressData = await Address.findOne({userId:userId})

        let wallet = await Wallet.findOne({userId})

        if(!wallet){
            wallet = new Wallet ({
                userId,
                balance:0, 
                transactions:[]
            })

            await wallet.save()
        }


        res.render('user/profile',{
            user:userData,
            userAddress:addressData,
            wallet,
        })
    } catch (error) {
        console.error('Error for retiving profile data',error);
        
        res.redirect("/pageNotFound")
    }
}


const getChangeEmail = async(req,res)=>{
    try {
        res.render('user/changeEmail')
    } catch (error) {
        console.log(error)
        res.redirect("/pageNotFound")
    }
}


const changeEmailValid = async(req,res)=>{
    try {
        const {email} = req.body 
        const userExist = await User.findOne({email:email})
        if(userExist){
            const otp  = generateOtp()
            const emailSent = await sendVerification(email,otp)
            if(emailSent){
                req.session.userOtp = otp
                req.session.userData = req.body
                req.session.email = email
                res.render('user/changeEmail-otp')
                console.log('change email send @:',email); 
                console.log('OTP:',otp); 
            }else{
                res.json({
                    success:false,
                    message:'Failed to send OTP'
                })
            }
        }else{
            res.render('user/changeEmail',{
                success:false,
                message:'user with this email dose not exist'
            })
        }
    } catch (error) {
        console.log('Error in change password validation',error)
        res.redirect("/pageNotFound")
    }
}
const verifyEmailOtp = async(req,res)=>{
    try {
        const enteredOtp = req.body.otp
        if(enteredOtp === req.session.userOtp){
            res.render('user/newEmail',{
                userData:req.session.userData
            })
        }else{
            res.render('user/changeEmail-otp',{
                message:'Otp not matching',
                userData:req.session.userData
            })
        }
    } catch (error) {
        console.log(error)
        res.redirect("/pageNotFound")
    }
}

const updateEmail = async(req,res)=>{
    try {
        const {newName,newEmail,newPhone} = req.body
        console.log('Updating user info to :',newEmail,'for user id:',req.session.user._id);
        const userId = req.session.user._id
        const existingUserName = await User.findOne({
            name:newName,
            _id:{$ne:userId}
        })
        const existingUserEmail = await User.findOne({
            email:newEmail,
            _id:{$ne:userId}
        })
        // const existingUserPhone = await User.findOne({
        //     phone:newPhone,
        //     _id:{$ne:userId}
        // })

        if(existingUserName ){
            return res.json({
                success:false,
                message:`${newName} has been used already`,
                redirectUrl:'/verify-email-Otp'
            })
        }
        if( existingUserEmail){
            return res.json({
                success:false,
                message:`${newEmail} has been used already`,
                redirectUrl:'/verify-email-Otp'
            })
        }
          
        await User.updateOne({_id:userId},{
            $set:{name:newName,email:newEmail,phone:newPhone}
        })
        req.session.user.email = newEmail
        return res.json({
                success:true,
                message:`User Info has been updated`,
                redirectUrl:'/user-profile'
            })
        // res.redirect('/user-profile')
    } catch (error) {
        console.log(error)
        res.redirect("/pageNotFound")
    }
}

const getChangePassword = async (req,res)=>{
    try {
        // res.render('user/changePassword')
        res.render('user/confirmCurrentPaswd')
    } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
    }
}
const forgotCurrentPswd = async (req,res)=>{
    try {
        res.render('user/changePassword') 
    } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
    }
}

const passwordConfirm = async (req,res)=> {
    try {
        const {password} =req.body
        const userId = req.session.user._id
        const user = await User.findById(userId)
        if(!user){
            return res.json({
                success:false,
                message:"User Not Logged in",
                redirectUrl:"/reset-password"
            })
        }
        if(user.isGoogleUser===true){
            return res.json({
                success:false,
                message:"User Account was a Single sign in using Google sign in ",
                redirectUrl:"/user-profile"
            })
        }
        const passwordMatch  = await bcrypt.compare(password,user.password)

        if(passwordMatch){
            res.json({
                success:true,
                message:"Success password confirmed",
                redirectUrl:"/reset-password"
            })
            
        }
        else{
            res.json({
                success:false,
                message:"Password did not match",
                redirectUrl:"/change-password"
            })
        }

    } catch (error) {
        console.log(error)
        res.json({
                success:false,
                message:"Something was wrong Error",
                redirectUrl:"/change-password"
            })
    }
}

const changePasswordValid = async(req,res)=>{
    try {
        const email = req.body.email
        const userExist = await User.findOne({email})
        if(userExist){
            const otp = generateOtp()
            const emailSent = await sendVerification(email,otp)
            if(emailSent){
                req.session.userOtp = otp
                req.session.userData = req.body
                req.session.email = email
                res.render('user/changePasswordOtp')
                console.log('change password otp send @:',email); 
                console.log('OTP:',otp); 
            }else{
                res.json({
                    success:false,
                    message:'Failed to send OTP,Please try again'
                })
            }
        }else{
            res.render('user/changePassword',{
                success:false,
                message:'user with this email dose not exist'
            })

        }
    } catch (error) {
        console.log('Error in change password validation',error)
        res.redirect("/pageNotFound")
    }
}

const verifyPasswordOtp = async(req,res)=>{
    try {
        const enteredOtp = req.body.otp
        if(enteredOtp === req.session.userOtp){
            res.json({
                success:true,
                redirectUrl:'/reset-password'
            })
        }else{
            res.json({
                success:false,
                message:'Otp not matching'
            })
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:'Erron occured in verifyOtp, Please try again later'})
    }
}

const getAddAddress = async (req,res)=>{
    try {
        const user = req.session.user
        res.render('user/add-Address',{
            user:user
        })
    } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
    }
}

const addAddress = async (req,res)=>{
    try {
        const userId = req.session.user._id
        const userData = await User.findById(userId)
        const{addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body
        const userAddress = await Address.findOne({userId:userData._id})
        if(!userAddress){
            const newAddress = new Address({
                userId:userData._id,
                address:[{addressType,name,city,landMark,state,pincode,phone,altPhone}]
            })
            await newAddress.save()
        }else{
            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone})
            await userAddress.save()
        }
        res.redirect('/user-profile')

    } catch (error) {
        console.log('Error in adding address',error)
        res.redirect('/pageNotFound')
    }
}

const getEditAddress = async(req,res)=>{
    try {
        const addressId = req.query.id
        const user = req.session.user
        const currentAddress = await Address.findOne({
            'address._id':addressId
        })
        if(!currentAddress){
            return res.redirect('/pageNotFound')
        }
        const addressData = currentAddress.address.find((item)=>{
            return item._id.toString()=== addressId.toString()
        })
        if(!addressData){
            return res.redirect('/pageNotFound')
        }
        res.render('user/edit-address',{
            address:addressData,
            user:user
        })
    } catch (error) {
        console.log('Error in edit address',error)
        res.redirect('/pageNotFound')
    }
}

const editAddress = async (req,res)=>{
    try {
        const data = req.body
        const addressId = req.query.id
        const user = req.session.user
        const findAddress = await Address.findOne({userId:user._id,'address._id':addressId})
        if(!findAddress){
            res.redirect('/pageNotFound')
        }
        await Address.updateOne(
            {userId:user._id,'address._id':addressId},
            {$set:{
                'address.$':{
                    _id:addressId,
                    addressType:data.addressType,
                    name:data.name,
                    city:data.city,
                    landMark:data.landMark,
                    state:data.state,
                    pincode:data.pincode,
                    phone:data.phone,
                    altPhone:data.altPhone,
                }
            }}
        )
        res.redirect('/user-profile')
    } catch (error) {
        console.log('Error in editing address',error)
        res.redirect('/pageNotFound')
    }
}
const deleteAddress = async (req,res)=>{
    try {
        const addressId = req.query.id
        const findAddress = await Address.findOne({'address._id':addressId})
        if(!findAddress){
            return res.status(404).send('Address not found')
        }
        await Address.updateOne( 
            {'address._id':addressId},
            {
                $pull:{
                    address:{
                        _id:addressId,
                    }
                }
            }
        )
        res.redirect('/user-profile')

    } catch (error) {
        console.log('Error in deleting address',error)
        res.redirect('/pageNotFound')
    }
}

export {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendForgotOtp,
    postNewPassword,
    userProfile,
    getChangeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    getChangePassword,
    passwordConfirm,forgotCurrentPswd,
    changePasswordValid,
    verifyPasswordOtp,
    getAddAddress,
    addAddress,
    getEditAddress,
    editAddress,
    deleteAddress
}