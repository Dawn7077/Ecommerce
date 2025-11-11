const express = require('express')
const  env = require('dotenv').config()
const session = require('express-session')
const db  = require('./models/db')
const path = require('path')
const userRouter = require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')
const passport = require('./config/passport')
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
    res.set('Cache-Control','no-store')
    next()
})

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))
app.use(express.static(path.join(__dirname,'public')))

app.use((req,res,next)=>{
    res.locals.user = req.session.user||null
    next()
})
app.use('/',userRouter)
app.use('/admin',adminRouter)

app.listen(process.env.PORT,()=>{
    console.log(`port listening at ${process.env.PORT}`)
})