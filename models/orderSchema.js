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
        default:()=>uuidv4(),
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
        returnRequestDate: Date
    }],
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
    // address: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Address",
    //     required: true
    // },
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
        enum: ['cod', 'online', 'Creditcard', 'RazerPay', 'Wallet'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
        default: 'Pending'
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
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

const Order =mongoose.model("Order",orderSchema)
module.exports= Order