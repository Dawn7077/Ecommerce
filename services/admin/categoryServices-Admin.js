import Category from '../../models/categorySchema.js'
import Product from '../../models/productSchema.js'
const catService = async function(search,skip,limit){ 
    
    const categoryData = await  Category.find({
                name:{$regex: new RegExp('.*'+search+'.*','i')}
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)

    return categoryData

}

const catTotal = async function(search){ 
    const totalCategories = await Category.countDocuments({
        name:{$regex: new RegExp('.*'+search+'.*','i')}
    })

    return totalCategories
} 
const findCategoryByName = async(name)=>{
    const existingCategory = await Category.findOne({ 
            name: {$regex: new RegExp('^' + name + '$', 'i')} 
        })
    return existingCategory

}
const createCategory = async (name, description) => {
    const newCategory = new Category({
        name,
        description,
    })
    return await newCategory.save()
} 
const findCategoryById = async (categoryId) => {
    return await Category.findById(categoryId)
}
const findProductsByCategory = async (categoryId) => {
    return await Product.find({ category: categoryId })
}
const resetProductOffers = async (products) => {
    for (const product of products) {
        product.productOffer = 0
        product.salesPrice = product.regularPrice
        await product.save()
    }
}
const removeProductOffers = async (products,percentage) => {
    for (const product of products) {
        product.salesPrice += Math.floor(product.regularPrice * (percentage / 100))
        product.productOffer = 0
        await product.save()
    }
}

const updateCategoryOffer = async(categoryId,percentage)=>{
   return await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } })
}
const updateCategoryListStatus = async (id,status)=>{
    return await Category.updateOne({ _id: id }, { $set: { isListed: status } })
}

const existingCategoryExcludingId =  async(categoryName,id)=>{
        return await Category.findOne({
            name: categoryName,
            _id: { $ne: id }
        })
}
const updateCategoryDetails = async (id, categoryName, description) => {
    return await Category.findByIdAndUpdate(id, {
            name: categoryName,
            description,
        }, { new: true })
}
const deleteCategoryServ = async (categoryId) => {
    return await Category.deleteOne({ _id: categoryId })
}



export{
    catService,
    catTotal, 
    findCategoryByName,
    createCategory,
    findCategoryById,
    findProductsByCategory,
    resetProductOffers,
    removeProductOffers,
    updateCategoryOffer,
    updateCategoryListStatus,
    existingCategoryExcludingId,
    updateCategoryDetails,
    deleteCategoryServ
} 