const User = require('../../models/userSchema')



const customerInfo = async(req,res)=>{
    try {
        
        const search = req.query.search || ''
        const page = req.query.page || 1
        const limit = 3

        const query = {
            isAdmin:false,
            $or:[
                {name:{$regex:'.*'+search+'.*', $options:'i'}},
                {email:{$regex:'.*'+search+'.*', $options:'i'}},
                {phone:{$regex:'.*'+search+'.*', $options:'i'}},
            ]
        } 
        const userData = await User.find(query)
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec()

        const count = await User.find(query).countDocuments()

        const totalPages = Math.ceil(count/limit)
        const deleted = req.query.deleted === 'true'

        res.render('admin/customers',{
            data:userData,
            totalPages,
            currentPage:page,
            search,
            deleted
        })

    } catch (error) {
        
    }
}
const customerBlocked = async(req,res)=>{
    try {
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/users')
    } catch (error) {
        req.redirect('/pageError')
    }
}

const customerUnBlocked = async(req,res)=>{
    try {
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        req.redirect('/pageError')
    }
}
const deleteCustomer = async(req,res)=>{
     try {
        const id = req.query.id
        await User.deleteOne({_id:id})
        res.redirect('/admin/users?deleted=true')
     } catch (error) {
        console.log('Error deleting',error);
        res.redirect('/admin/pageError')
     }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerUnBlocked,
    deleteCustomer
}