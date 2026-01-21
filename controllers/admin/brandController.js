import Brand from '../../models/brandSchema.js'
import Product from '../../models/productSchema.js'
import StatusCodes from '../../utils/httpStatus.js'

import {
    getBrandsPagination,
    getBrandsCount ,
    findBrandByName,
    createBrand,
    blockBrand as blockBrandSer,
    unblockBrand as unblockBrandSer,
    deleteBrandSer,
    findBrandByNameExcludingId,
    updateBrandDetails

} from '../../services/admin/brandServices.js'

const getBrandPage = async(req,res)=>{
    try {
        const updated = req.query.updated
        const page = parseInt(req.query.page)||1
        const search = req.query.search || ''
        const limit = 2 
        const skip = (page-1)*limit

        // const brandData = await Brand.find({
        //     brandName:{$regex: new RegExp('.*'+search+'.*','i')}
        // })
        // .sort({createdAt:-1})
        // .skip(skip)
        // .limit(limit)

        const brandData = await getBrandsPagination (search,skip,limit)
        console.log('brandData',brandData);
        
       
        // const totalBrands = await Brand.countDocuments({
        //      brandName:{$regex: new RegExp('.*'+search+'.*','i')}
        // })
        const totalBrands = await getBrandsCount(search)
        const totalPages = Math.ceil(totalBrands/limit)
        const reverseBrand = brandData.reverse()

        if (req.headers.accept?.includes('application/json')) {
            return res.json({
                success: true,
                data: reverseBrand,
                currentPage: page,
                totalPages,
                totalBrands,
                search
            })
        }
         

        res.render('admin/brands',{
            data:reverseBrand,
            currentPage:page,
            totalPages,
            totalBrands,
            search,
            updated
            
        })
    } catch (error) {
        console.log(error)
        
        if (req.headers.accept?.includes('application/json')) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
                success: false, 
                message: 'Server error' 
            })
        }
        
        res.redirect('/admin/pageError')
    }
}



const addBrand = async(req,res)=>{
    try {
        const brand =req.body.name.trim()

        if (!brand) {
            return res.json({
                success: false,
                message: 'Brand name is required'
            })
        }

        // const findBrand = await Brand.findOne({
        //     brandName:{$regex: new RegExp(`^${brand}$`,`i`)}
        // })
        const findBrand = await findBrandByName(brand)
        if(findBrand){
             return res.json({
                success: false,
                message: 'Brand name already exists'
            });
        }

        if (!req.file) {
            return res.json({
                success: false,
                message: 'Brand image is required'
            })
        }
          
            const image = req.file.filename

            // const newBrand =new Brand({
            //     brandName:brand,
            //     brandImage:image
            // })
            // await newBrand.save()
            const newBrand = await createBrand(brand, image)




            // res.redirect('/admin/brands')
            return res.json({
                success: true,
                brand: newBrand
            })
         
    } catch (error) {
        console.error(error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Server error'
            });
    }
}

const blockBrand =async (req,res)=> {
    try {
        const id = req.query.id
        if (!id) {
            return res.json({
                success: false,
                message: 'Brand ID is required'
            })
        }
        // await Brand.updateOne({_id:id},{$set:{isBlocked:true}})
        await blockBrandSer(id)

        if (req.headers.accept?.includes('application/json')) {
            return res.json({
                success: true,
                isBlocked: true,
                message: 'Brand blocked successfully'
            })
        }

        res.redirect('/admin/brands')
    } catch (error) {
        console.log(error)
        
        if (req.headers.accept?.includes('application/json')) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to block brand'
            })
        }
        
        res.redirect('/admin/pageError')
    }
}
const unBlockBrand =async (req,res)=> {
    try {
        const id = req.query.id
         if (!id) {
            return res.json({
                success: false,
                message: 'Brand ID is required'
            })
        }
        // await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
        await unblockBrandSer(id)

         if (req.headers.accept?.includes('application/json')) {
            return res.json({
                success: true,
                isBlocked: false,
                message: 'Brand unblocked successfully'
            })
        }

        res.redirect('/admin/brands')
    } catch (error) {
        console.log(error); 
        if (req.headers.accept?.includes('application/json')) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to unblock brand'
            })
        }
        res.redirect('/admin/pageError')
    }
}
const deleteBrand =async (req,res)=> {
    try {
        const {id} = req.query 
        if (!id) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Brand ID is required'
            })
        }
        // await Brand.deleteOne({_id:id})
        await deleteBrandSer(id)

        if (req.headers.accept?.includes('application/json')) {
            return res.json({
                success: true,
                message: 'Brand deleted successfully'
            })
        }

        res.redirect('/admin/brands')
    } catch (error) {
        console.log("Error deletiing the brand",error); 
        if (req.headers.accept?.includes('application/json')) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to delete brand'
            })
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect('/admin/pageError')
    }
}
const editBrand = async(req,res)=>{
    try {
        const {brandId,name} = req.body
        const brandName = name.trim()

        if (!brandName) {
            return res.json({
                success: false,
                message: 'Brand name is required'
            })
        }

        // const existingBrand = await Brand.findOne({
        //     brandName:{$regex:new RegExp(`^${brandName}$`,'i')},
        //     _id:{$ne:brandId}
        // })
        const existingBrand = await findBrandByNameExcludingId(brandName,brandId)
        if(existingBrand){
            return res.json({
                success: false,
                message: 'Brand name already exists'
            });
        }


        let updateData = {
            brandName:name
        }
        if(req.file){
            updateData.brandImage = req.file.filename
        }

        // const updatedBrand = await Brand.findByIdAndUpdate(brandId, updateData, {new: true})
        const updatedBrand = await updateBrandDetails(brandId,updateData)
        
        // res.redirect('/admin/brands?updated=true') 
        
        return res.json({ 
            success: true, 
            message: 'Brand updated successfully!',
            brand: updatedBrand
        })
    } catch (error) {
        console.log("Error editing brand:",error)
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error'
        })
    }
}


 export {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand,
    editBrand,
}