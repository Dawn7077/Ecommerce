const mongoose = require('mongoose')
const user = require('../../UserManageApp/model/user')
const {Schema} = mongoose
const userSchema = new Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true,
        default:undefined
    },
    password:{
        type:String,
        required:false,
    },
    isBlocked:{
        type:Boolean,
        default:false,
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart",
    }],
    wallet:{
        type:Number,
        default:0
    },
    wishlist:[{
        type:Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"order",
    }],
    createdOn:{
        type:Date,
        default:Date.now,
    },
    referalCode:{
        type:String,
        // required:true

    },
    redeemed:{
        type:Boolean,
        // default:false
    },
    redeemedUser:[{
        type:Schema.Types.ObjectId,
        ref:"User",
        // default:false

    }],
    searchHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Category",
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }],
    
    
})
const User = mongoose.model('User',userSchema)

module.exports = User