const User =require("../../models/userSchema")
const nodemailer =require('nodemailer')
const bcrypt = require('bcrypt')
const env = require("dotenv").config()
const loadHomePage = async (req,res)=>{
    try {
        const user = req.session.user
        if(user){
            const UserData =await User.findOne({_id:user._id})
            res.render('user/home',{user})
        }else{
            return res.render('user/home',{user:null})
        }

    } catch (error) {
        console.log("home page not found");
        res.status(500).send('server error')
    }
}
const pageNotFound = async(req,res)=>{
    try {
        res.render('user/page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}
const loadSignUp = async(req,res)=>{
    try {
        return res.render('user/signup')
    } catch (error) {
        console.log('Home page not loading',error)
        res.status(500).send('Server Error')
    }
}

// const signup = async (req,res)=>{
//     const {name, email,phone,password,cPassword}=req.body 
//     try {
//         const newUser = new User({name, email,phone,password})
//         console.log(cPassword);
//         // console.log(newUser);
        
//         await newUser.save()

//         return res.redirect('/signup')
//     } catch (error) {
//         console.error("Error for saved user",error);
//         res.status(500).send('Internal server error')
        
//     }
// }

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString()
}
async function sendVerificationEmail(email,otp){
    try {
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })  

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP:${otp}</b>`
        })

        return info.accepted.length>0

    } catch (error) {
        console.error('Error sending email',error)
        return false
    }
}
const signup = async(req,res)=>{
    try {
        const {name,email,phone,password,cPassword}=req.body
        if(password!==cPassword){
            return res.render('user/signup',{message:"Password do not match"})
        }
        const findUser = await User.findOne({email})
        if(findUser){
            return res.render('user/signup',{message:"User with this email already exists"})
        }
        const otp = generateOtp()
        const emailSent = await sendVerificationEmail(email,otp)
        if(!emailSent){
            return res.json('email-error')
        }
        req.session.userOtp = otp
        req.session.userData = {name,email,phone,password}

        res.render("user/verify-otp")
        console.log('OTP sent',otp)

    } catch (error) {
        console.error('user/signup error',error)
        res.redirect('/pageNotFound')
    }
}
const securePassword = async(password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        
    }
}
const verifyOtp = async(req,res)=>{
    try {
        const {otp} = req.body
        console.log(otp)
        if(otp === req.session.userOtp){//for google already signedup email which dont have a password
            const user = req.session.userData
            const existingUser = await User.findOne({email:user.email})
            if(existingUser){
                req.session.user ={
                    _id:existingUser._id,
                    name:existingUser.name,
                    email:existingUser.email
                }
                return res.json({success:true,redirectUrl:'/'})
            }




            const passwordHash = await securePassword(user.password)
            const saveUserData = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password: passwordHash,
            })
            await saveUserData.save()
            req.session.user={
                _id:saveUserData._id,
                name:saveUserData.name,
                email:saveUserData.email
            }
            res.json({success:true,redirectUrl:'/'})
        }else{
            res.status(400).json({success:false,message:'Invalid OTP, Please try again'})
        }
    } catch (error) {
        console.error("Error verifying OTP",error);
        res.status(500).json({success:false,message:"An error has occured"})
        
    }
}
const resendOtp = async(req,res)=>{
    try {
        const {email}= req.session.userData
        if(!email){
            return res.status(400).json({success:false,message:'Email not found in session'})
        }
        const otp = generateOtp()
        req.session.userOtp = otp

        const emailSent =await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log('Resent OTP',otp);
            res.status(200).json({success:true,message:'OTP Resent Successfully'})
            
        }else{
             res.status(500).json({success:false,message:'Failed to Resent OTP, Please try again'})
           
        }
    } catch (error) {
        console.error("Error resending OTP");
        
        res.status(500).json({success:false,message:'Internal Server Error'})
           
    }
}

const loadlogin = async(req,res)=>{
    try {
        if(!req.session.user){
            return res.render("user/login")
        }else{
            res.redirect('/')
        }

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const login = async(req,res)=>{
    try {
        const{email,password}= req.body
        const findUser  = await User.findOne({isAdmin:0,email:email})
        
        if(!findUser){
            return res.render('user/login',{message:"User Not found"})
        }
        if(findUser.isBlocked){
            res.render('user/login',{message:"User is Blocked by admin"})
        }

        const passportMatch = await bcrypt.compare(password,findUser.password)

        if(!passportMatch){
            return res.render('user/login',{message:"Incorrect Password"})
        }

        req.session.user = {
            _id:findUser._id,
            name:findUser.name,
            email:findUser.email,
        }
        res.redirect('/')

    } catch (error) {
        console.error("login error",error);
        res.render('user/login',{message:"Login Failed ,Please try again later"})
        
    }
}
const logout = async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log('Session destruction error',err.message);
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/login')
        })
    } catch (error) {
        console.error("Logout Error",error);
        res.redirect('/pageNotFound')
        
    }
}

module.exports = {
    loadHomePage,
    loadSignUp,
    signup,
    verifyOtp,
    resendOtp,
    loadlogin,
    login,
    logout,
    pageNotFound
}