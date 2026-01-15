import mongoose from "mongoose"
const {Schema} = mongoose

const productSchema =new Schema({
    productName:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    brand:{
        type:String,
        required:true
    },
    category:[{ // check on the category storing should it be refernce id{} or ref Id[{}] with controller
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
    }],
    regularPrice:{
        type:Number,
        required:true
    },
    salesPrice:{
        type:Number,
        required:true
    },
    productOffer:{
        type:Number,
        default:0
    },
    // quantity:{
    //     type:Number,
    //     default:1
    // },
    // color:{
    //     type:String,
    //     require:true
    // },
    // size:{
    //     type:String,
        
    // },
    // highlights:[{
    //     type:String,
    //     value:String,
    // }],
    variants:[{
        color:String,
        size:String,
        stock:Number
    }],
    productImage:{
        type:[String],
        require:true
    }, 
    highlights:{
        type:[String],
        default:[]
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","out of stock","Discontinued"],
        required:true,
        default:"Available"
    }
},{timestamps:true})

productSchema.virtual('totalStock').get(function (){
    return this.variants.reduce((sum,v)=> sum +(v.stock || 0),0)
})

productSchema.set('toJSON', { virtuals: true });//for sending virtual data to frontend
productSchema.set('toObject', { virtuals: true });//for recieving virtual data from frontend


const Product =  mongoose.model("Product",productSchema)


export default Product