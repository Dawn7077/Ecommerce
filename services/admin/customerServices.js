import User from '../../models/userSchema.js'

const buildCustomerSearchQuery = (search) => {
    return {
        isAdmin: false,
        $or: [
            { name: { $regex: '.*' + search + '.*', $options: 'i' } },
            { email: { $regex: '.*' + search + '.*', $options: 'i' } },
            { phone: { $regex: '.*' + search + '.*', $options: 'i' } },
        ]
    }
}
const getUserWithPagination = async (query, page, limit) => {
    return await User.find(query)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec()
}
const getCustomersCount = async (query) => {
    return await User.find(query).countDocuments()
}

const updateCustomerBlockStatus = async (customerId, isBlocked) => {
    return await User.updateOne(
        { _id: customerId }, 
        { $set: { isBlocked } }
    )
}

const blockCustomer = async (customerId) => {
    return await updateCustomerBlockStatus(customerId, true)
}

const unblockCustomer = async (customerId) => {
    return await updateCustomerBlockStatus(customerId, false)
}
 
const deleteCustomer = async (customerId) => {
    return await User.deleteOne({ _id: customerId })
}

export {
    buildCustomerSearchQuery,
    getUserWithPagination,
    getCustomersCount,
    updateCustomerBlockStatus,
    blockCustomer,
    unblockCustomer,
    deleteCustomer
}