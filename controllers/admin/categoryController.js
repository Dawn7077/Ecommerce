import Category from '../../models/categorySchema.js'
import Product from '../../models/productSchema.js'
import StatusCodes from '../../utils/httpStatus.js'
import {
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
}  from '../../services/admin/categoryServices-Admin.js'

const categoryInfo = async (req, res) => {
    try {
        
        const page = parseInt(req.query.page) || 1
        const search = req.query.search || ''
        const limit = 4
        const skip = (page - 1) * limit



        // const categoryData = await Category.find({
        //     name:{$regex: new RegExp('.*'+search+'.*','i')}
        // })
        //     .sort({ createdAt: -1 })
        //     .skip(skip)
        //     .limit(limit)

        // const totalCategories = await Category.countDocuments({
        //     name:{$regex: new RegExp('.*'+search+'.*','i')}
        // })

        const categoryData = await catService(search,skip,limit)

        const totalCategories = await catTotal(search)
        console.log(categoryData,totalCategories)

 

        const totalPages = Math.ceil(totalCategories / limit)


        if (req.headers.accept?.includes('application/json')) {
            return res.json({
                success: true,
                categories: categoryData,
                currentPage: page,
                totalPages,
                totalCategories,
                search
            })
        }

        res.render('admin/category', {
            cat: categoryData,
            currentPage: page,
            totalPages,
            totalCategories,
            search,
        })
    } catch (error) {
        console.log("Error in categoryInfo", error);
        if (req.headers.accept?.includes('application/json')) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: 'Server error' 
            })
        }
        res.redirect('/admin/pageError')
    }
}

const addCategory = async (req, res) => {   
    const { name, description } = req.body
    try {
        if (!name || !description) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false,
                error: "Name and description are required" 
            })
        }

        const existingCategory = await findCategoryByName(name)
        
        if (existingCategory) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "Category already exists" })
        }

        const newCategory = await createCategory(name, description)
        
        if (newCategory) {
            return res.json({ 
                success: true,
                message: 'Category added successfully',
                category: newCategory
            })
        }
    } catch (error) {
        console.log("Error in addCategory", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false,
            error: "Internal server error" 
        })
    }
}

const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage)
        const categoryId = req.body.categoryId
        // const category = await Category.findById(categoryId)
        const category = await findCategoryById(categoryId)

        if (!categoryId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                status: false, 
                message: 'Category ID is required' 
            })
        }

        if(!percentage || percentage < 1 || percentage > 90) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                status: false, 
                message: 'Percentage must be between 1 and 90' 
            });
        }

        if (!category) {
            return res.status(StatusCodes.NOT_FOUND).json({ status: false, message: 'Category not found' })
        }

        // const products = await Product.find({ category: category._id })
        const products = await findProductsByCategory(category._id )
        const hasProductOffer = products.some((product) => product.productOffer > percentage)
        
        
        if (hasProductOffer) {
            return res.json({ status: false, message: 'Products within this category already have Product Offer' })
        }


        // await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } })
        await updateCategoryOffer(categoryId,percentage)

        // for (const product of products) {
        //     product.productOffer = 0
        //     product.salesPrice = product.regularPrice
        //     await product.save()
        // }
        resetProductOffers(products)
        

        return res.json({ 
            status: true, 
            message: 'Category offer added successfully',
            percentage
        })

    } catch (error) {
        console.log(error)
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            status: false, 
            message: 'Internal server error' 
        })
    }
}

const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId

        if (!categoryId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                status: false, 
                message: 'Category ID is required' 
            })
        }
 
        // const category = await Category.findById(categoryId)
        const category = await findCategoryById(categoryId)
        if (!category) {
            return res.status(StatusCodes.NOT_FOUND).json({ status: false, message: 'Category not found' })
        }
        
        const percentage = category.categoryOffer
        const products = await findProductsByCategory(category._id )
        // const products = await Product.find({ category: { $in: [category._id] } })
        
        if (products.length > 0) {
            // for (const product of products) {
            //     product.salesPrice += Math.floor(product.regularPrice * (percentage / 100))
            //     product.productOffer = 0
            //     await product.save()
            // }
            removeProductOffers(products,percentage)
        }
        // category.categoryOffer = 0
        // await category.save()


        await updateCategoryOffer(category,0)


        res.json({ status: true, message: 'Category offer removed successfully' })
    } catch (error) {
        console.log(error)
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: false, message: 'Internal server error' })
    }
}

const getListCategory = async (req, res) => {
    try {
        // await Category.updateOne({ _id: id }, { $set: { isListed: false } })
        
        let id = req.query.id
        if (!id) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false, 
                message: 'Category ID is required' 
            })
        }
       await updateCategoryListStatus(id,false)

       if (req.headers.accept?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: 'Category unlisted successfully',
                isListed: false
            })
        }

        res.redirect('/admin/category')
    } catch (error) {
        console.log("Error in getListCategory", error)
        
        if (req.headers.accept?.includes('application/json')) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: 'Failed to unlist category' 
            })
        }
        res.redirect('/pageError')
    }
}

const getUnlistCategory = async (req, res) => {
    try {
        let id = req.query.id
        if (!id) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false, 
                message: 'Category ID is required' 
            })
        }

        // await Category.updateOne({ _id: id }, { $set: { isListed: true } })
        await await updateCategoryListStatus(id,true) 


        if (req.headers.accept?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: 'Category listed successfully',
                isListed: true
            })
        }

        res.redirect('/admin/category')
    } catch (error) {
        console.log("Error in getUnlistCategory", error)
        
        if (req.headers.accept?.includes('application/json')) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: 'Failed to list category' 
            })
        }

        res.redirect('/pageError')
    }
}

const getEditCategory = async (req, res) => {
    try {
        const id = req.query.id
         if (!id) {
            return res.redirect('/admin/category')
        }

        // const category = await Category.findOne({ _id: id })
        const category = await findCategoryById(id)
        if (!category) {
            return res.redirect('/admin/category')
        }
        
        res.render('admin/edit-category', { category: category })
    } catch (error) {
        console.log("Error in getEditCategory", error)
        res.redirect('/pageError')
    }
}
const editCategory = async (req, res) => {
    try {
        const id = req.params.id
        const { categoryName, description } = req.body

        if (!categoryName || !description) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false,
                error: 'Category name and description are required' 
            })
        }


        // const existingCategory = await Category.findOne({
        //     name: categoryName,
        //     _id: { $ne: id }
        // })
        const existingCategory = await existingCategoryExcludingId(categoryName,id)

        if (existingCategory) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false,
                error: 'Category name exists, please choose another name' 
            })
        }


        // const updateCategory = await Category.findByIdAndUpdate(id, {
        //     name: categoryName,
        //     description,
        // }, { new: true })
        const updateCategory = await updateCategoryDetails(id,categoryName,description)
        
        if (updateCategory) {
            return res.json({ 
                success: true, 
                message: 'Category updated successfully',
                category: updateCategory
            })
        } else {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                success: false,
                error: 'Category not found' 
            })
        }
    } catch (error) {
        console.log('Error in editCategory', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false,
            error: 'Internal server error' 
        })
    }

}

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.query
        if (!id) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false,
                message: 'Category ID is required' 
            })
        }
        // await Category.deleteOne({ _id: id }) 
        await deleteCategoryServ(id) 

        return res.json({ 
            success: true, 
            message: 'Category deleted successfully' 
        })
    } catch (error) {
        console.log("Error deletiing the category", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false,
            message: 'Failed to delete category' 
        })
    }
}


export {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
    deleteCategory
}