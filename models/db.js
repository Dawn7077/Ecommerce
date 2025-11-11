const mongoose = require('mongoose')
const env = require('dotenv').config()

const connectDB = async()=>{
    try { 
    const connection  = await mongoose.connect(process.env.MONGO_URI) 
    console.log('DB connected...');
    
    } catch (error) {
        console.log(error.message);
        
    }
}
module.exports = connectDB