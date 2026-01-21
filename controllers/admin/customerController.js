import User from '../../models/userSchema.js'

import {
    buildCustomerSearchQuery,
    getUserWithPagination,
    getCustomersCount,
    updateCustomerBlockStatus,
    blockCustomer,
    unblockCustomer,
    deleteCustomer as deleteCustomerSer,

} from '../../services/admin/customerServices.js'

const customerInfo = async(req,res)=>{
    try {
        
        const search = req.query.search || ''
        const page = parseInt(req.query.page )|| 1
        const limit = 3

        // const query = {
        //     isAdmin:false,
        //     $or:[
        //         {name:{$regex:'.*'+search+'.*', $options:'i'}},
        //         {email:{$regex:'.*'+search+'.*', $options:'i'}},
        //         {phone:{$regex:'.*'+search+'.*', $options:'i'}},
        //     ]
        // } 

        // const userData = await User.find(query)
        // .limit(limit*1)
        // .skip((page-1)*limit)
        // .exec()
        
        
        // const count = await User.find(query).countDocuments()
        
        const query =  buildCustomerSearchQuery(search)
        const userData = await getUserWithPagination(query,page,limit)
        const count = await getCustomersCount(query)


        const totalPages = Math.ceil(count/limit)
        const deleted = req.query.deleted === 'true'
        
                    
        if (req.headers.accept?.includes('application/json')) {
        return res.json({
                success: true,
                data: userData,
                totalPages,
                currentPage: page,
                search
            })
        }


        res.render('admin/customers',{
            data:userData,
            totalPages,
            currentPage:page,
            search,
            deleted:false
        })

    } catch (error) {
        console.log(error)
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: 'Server error' })
        }
         
        res.redirect('/admin/pageError')
    }
}
const customerBlocked = async(req,res)=>{
    try {
        let id = req.query.id
        if (!id) {
            return res.status(400).json({ success: false, message: 'User ID required' })
        }
        // await User.updateOne({_id:id},{$set:{isBlocked:true}})
        // res.redirect('/admin/users')

        await blockCustomer(id)
        res.json({ 
            success: true, 
            blocked: true,
            message: 'Customer blocked successfully'
        })

    } catch (error) {
        console.log(error)
        // req.redirect('/pageError')
        res.status(500).json({ 
            success: false, 
            message: 'Failed to block customer' 
        })
    }
}

const customerUnBlocked = async(req,res)=>{
    try {
        let id = req.query.id
         
        if (!id) {
            return res.status(400).json({ success: false, message: 'User ID required' })
        }
        // await User.updateOne({_id:id},{$set:{isBlocked:false}})
        // res.redirect('/admin/users')
        await unblockCustomer(id)
        res.json({ 
            success: true, 
            blocked: false,
            message: 'Customer unblocked successfully'
        })

    } catch (error) {
        console.log(error)
        res.status(500).json({ 
            success: false, 
            message: 'Failed to unblock customer' 
        })
        // req.redirect('/pageError')
    }
}
const deleteCustomer = async(req,res)=>{
     try {
        const id = req.query.id
        if (!id) {
            return res.status(400).json({ success: false, message: 'User ID required' })
        }
        // await User.deleteOne({_id:id})
        await deleteCustomerSer(id)
        if (req.headers.accept?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: 'Customer deleted successfully' 
            })
        }
        res.redirect('/admin/users?deleted=true')
     } catch (error) {
        console.log('Error deleting',error);
        
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to delete customer' 
            })
        }

        res.redirect('/admin/pageError')
     }
}

export {
    customerInfo,
    customerBlocked,
    customerUnBlocked,
    deleteCustomer
}