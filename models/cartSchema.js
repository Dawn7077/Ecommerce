const mongoose =require('mongoose')
const {Schema} = mongoose

const cartSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        require:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        variant:{
            color:String,
            size:String,
        },
        quantity:{
            type:Number,
            default:1
        },
        price:{
            type:Number,
            required:true,
            default:0
        },
        totalPrice:{
            type:Number,
            required:true,
            default:0
        },
        status:{
            type:String,
            default:'placed'
        },
        cancellationReason:{
            type:String,
            default:'none'
        }
    }]
})

const Cart = mongoose.model("Cart",cartSchema)

module.exports = Cart