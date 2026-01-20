// const User = require('../../models/userSchema')
// const Wallet = require('../../models/walletSchema')
// const Stripe = require('stripe')
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

import User from '../../models/userSchema.js'
import Wallet from '../../models/walletSchema.js'
import Stripe from 'stripe'
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
import StatusCodes from '../../utils/httpStatus.js'

const getWallet = async (req,res)=>{
    try {
        const userId = req.session.user._id

        let wallet = await Wallet.findOne({userId})

        if(!wallet){
            wallet = new Wallet ({
                userId,
                balance:0, 
                transactions:[]
            })

            await wallet.save()
        }

        res.render('user/wallet',{wallet})
        
    } catch (error) {
        console.log("get wallet error",error);
        res.redirect('/pageNotFound')
    }
}

const addWalletMoney = async (req,res)=>{
    try {
        const userId = req.session.user._id
        const { amount } = req.body

        const MIN_TOPUP_AMOUNT = 50;  

        if(!amount || amount < MIN_TOPUP_AMOUNT || amount > 9999999){
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: `Amount must be between ₹${MIN_TOPUP_AMOUNT} and ₹9,999,999` });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types:['card'],
            mode:'payment',
            line_items:[
                {
                    price_data:{
                        currency:'inr',
                        product_data:{
                            name:'Wallet Top-up'
                        },
                        unit_amount:amount*100,
                    },
                    quantity:1,
                }
            ],
            success_url:`${process.env.BASE_URL}/wallet/stripe-success?amount=${amount}`,
            cancel_url:`${process.env.BASE_URL}/wallet/stripe-cancel`,
        })
        res.json({success:true,url:session.url})
    } catch (error) {
        console.log("Stripe wallet session error:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Stripe session failed" });
    }
}

const stripeWalletSuccess = async(req,res)=>{
    try {
        const userId = req.session.user._id
        const amount = parseFloat(req.query.amount)

        if(!amount) return res.redirect('/wallet')

        let wallet = await Wallet.findOne({userId})

        if(!wallet){
            wallet = new Wallet({
                userId,
                balance:0,
                transactions:[],
            })
        }

        wallet.balance += amount
        wallet.transactions.push({
            date :new Date(),
            type: 'credit',
            amount,
            reason:'Wallet Top-up',
        })

        await wallet.save()

        return res.redirect('/wallet')

    } catch (error) {
        console.log("Stripe wallet success error:", error);
        return res.redirect('/wallet');
    }
}
const stripeWalletCancel = async(req,res)=>{
     return res.redirect('/wallet')
}

export  {
    getWallet,
    addWalletMoney,
    stripeWalletSuccess,
    stripeWalletCancel,
}