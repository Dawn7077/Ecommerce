const User =require('../../models/userSchema')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv')
const session = require('express-session')
const user = require('../../../UserManageApp/model/user')


const securePassword = async(password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) { 

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
        res.status(500).json({success:false,message:'An error occured ,Please try again'})
    }
}

const getResetPassPage = async(req,res)=>{
    try {
        res.render('user/reset-password')
    } catch (error) {
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
        res.redirect("/pageNotFound")
    }
}


const userProfile = async(req,res)=>{
    try {
        const userId = req.session.user
        const userData = await User.findById(userId)
        res.render('user/profile',{
            user:userData
        })
    } catch (error) {
        console.error('Error for retiving profile data',error);
        
        res.redirect("/pageNotFound")
    }
}


module.exports= {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendForgotOtp,
    postNewPassword,
    userProfile
}