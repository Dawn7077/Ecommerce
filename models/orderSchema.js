const mongoose = require('mongoose')
const {Schema}= mongoose
const {v4:uuidv4} = require("uuid")

const orderSchema1 = new Schema({
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        require:true
    },
    orderedItems:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            require:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        },
        totalPrice:{
            type:Number,
            required:true
        },
        discount:{
            type:Number,
            default:0
        },
        finalAmount:{
            type:Number,
            required:true
        },
        address:{
            type:Schema.Types.ObjectId,
            ref:"Address",
            required:true

        },
        invoiceDate:{
            type:Date
        },
        status:{
            type:String,
            enum:['Payment Pending',"Pending","Processing","Shipped","Delivered","Cancelled","Return Request","Returned"],
            default: "Pending"
        },
        createdOn:{
            type:Date,
            default:Date.now,
            requird:true
        },
        couponApplied:{
            type:Boolean,
            default:false
        }

    }]
})

const orderSchema = new mongoose.Schema({
    orderId:{
        type:String,
        // default:()=>uuidv4(),
        unique:true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderedItems: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        productName: String,
        productImage: String,
        variant:{
            color:String,
            size:String,
        },
        status: {
            type: String,
            enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Return Requested'],
            default: 'Pending'
        },
        statusHistory: [{
            status: String,
            date: {
                type: Date,
                default: Date.now
            },
            note: String
        }],
        cancellationReason: String,
        returnReason: String,
        returnRequestDate: Date,
        refunded:{
            type:Boolean,
            default:false
        }, 
        restocked: { 
            type: Boolean, 
            default: false
        }
    }],
    subtotal: {
        type: Number, 
    },
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    }, 
    address: {
        addressType: String,
        name: String,
        city: String,
        landMark: String,
        state: String,
        pincode: Number,
        phone: String,
        altPhone: String
    },

    paymentMethod: {
        type: String,
        enum: ['cod', 'online', 'Creditcard', 'Stripe', 'Wallet'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed', 'Refunded','Payment Pending','Paid'],
        default: 'Pending'
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled','Returned'],
        default: 'Pending'
    },
    orderStatusHistory:[{
         status: String,
            date: {
                type: Date,
                default: Date.now
            },
    }],
    invoiceDate: {
        type: Date,
        default: Date.now
    },
    deliveryDate: Date,
    couponApplied: {
        type: Boolean,
        default: false
    },
    couponDiscount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});
orderSchema.pre('save',async function (next) {
    if(this.orderId) return next()
         
    const lastOrder = await this.constructor.findOne().sort({createdAt:-1})

    let nextId = 1
    if(lastOrder && lastOrder.orderId){
        const lastNumber = parseInt(lastOrder.orderId.split('-')[1])
        nextId =lastNumber + 1
    }
    this.orderId = `ORD-${String(nextId).padStart(4, "0")}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`
    next()
})  

const Order =mongoose.model("Order",orderSchema)
module.exports= Order