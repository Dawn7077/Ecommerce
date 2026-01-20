// const express = require('express')
// const  env = require('dotenv').config()
// const session = require('express-session')
// const db  = require('./models/db')
// const path = require('path')
// const userRouter = require('./routes/userRouter')
// const adminRouter = require('./routes/adminRouter')
// const passport = require('./config/passport')

import express from 'express'
import session from 'express-session'
import dotenv from 'dotenv'

import db from './models/db.js'
import { fileURLToPath } from 'url'
import path from 'path'

import userRouter from './routes/userRouter.js'
import adminRouter from './routes/adminRouter.js'
import passport from './config/passport.js'
import morgan from "morgan";


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


dotenv.config()

const app = express()
db()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:1000*60*60*72
    }
}))

app.use(passport.initialize())
app.use(passport.session())

app.use((req,res,next)=>{
    res.setHeader('Cache-Control','no-store','no-cache','must-revalidate','private')
    next()
})

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))
app.use(express.static(path.join(__dirname,'public')))

// app.use(
//   morgan('combined', {
//     skip: (req) => req.url.startsWith('/js')
//         || req.url.startsWith('/css')
//         || req.url.startsWith('/img')
//   })
// );

app.use((req,res,next)=>{
    res.locals.user = req.session.user||null
    res.locals.admin = req.session.admin||null
    next()
})

app.use('/',userRouter)
app.use('/1',(req,res)=>{
    res.render('user/test')
})

app.use('/admin',adminRouter)

app.listen(process.env.PORT,()=>{
    console.log(`port listening at ${process.env.PORT}`)
})