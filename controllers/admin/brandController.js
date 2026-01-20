import Brand from '../../models/brandSchema.js'
import Product from '../../models/productSchema.js'
import StatusCodes from '../../utils/httpStatus.js'

const getBrandPage = async(req,res)=>{
    try {
        const updated = req.query.updated
        const page = parseInt(req.query.page)||1
        const search = req.query.search || ''
        const limit = 2 
        const skip = (page-1)*limit

        const brandData = await Brand.find({
            brandName:{$regex: new RegExp('.*'+search+'.*','i')}
        })
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)
        console.log('brandData',brandData);
        
        const totalBrands = await Brand.countDocuments({
             brandName:{$regex: new RegExp('.*'+search+'.*','i')}
        })
        const totalPages = Math.ceil(totalBrands/limit)
        const reverseBrand = brandData.reverse()
         

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
        res.redirect('/admin/pageError')
    }
}



const addBrand = async(req,res)=>{
    try {
        const brand =req.body.name.trim()
        const findBrand = await Brand.findOne({
            brandName:{$regex: new RegExp(`^${brand}$`,`i`)}
        })
        if(findBrand){
             return res.json({
                success: false,
                message: 'Brand name already exists'
            });
        }

        // if (!req.file) {
        // return res.json({
        //         success: false,
        //         message: 'Brand image is required'
        //     });
        // }
         
        if(!findBrand){
            const image = req.file.filename
            const newBrand =new Brand({
                brandName:brand,
                brandImage:image
            })
            await newBrand.save()
            // res.redirect('/admin/brands')
            return res.json({
                success: true
            });
        }
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
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/brands')
    } catch (error) {
        console.log(error); 
        res.redirect('/admin/pageError')
    }
}
const unBlockBrand =async (req,res)=> {
    try {
        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/brands')
    } catch (error) {
        console.log(error); 
        res.redirect('/admin/pageError')
    }
}
const deleteBrand =async (req,res)=> {
    try {
        const {id} = req.query
        if(!id){
            return res.status(StatusCodes.BAD_REQUEST).redirect('/admin/pageError')
        }
        await Brand.deleteOne({_id:id})
        res.redirect('/admin/brands')
    } catch (error) {
        console.log("Error deletiing the brand",error); 
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect('/admin/pageError')
    }
}
const editBrand = async(req,res)=>{
    try {
        const {brandId,name} = req.body
        const brandName = name.trim()

        const existingBrand = await Brand.findOne({
            brandName:{$regex:new RegExp(`^${brandName}$`,'i')},
            _id:{$ne:brandId}
        })

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

        await Brand.findByIdAndUpdate(brandId,updateData)
        // res.redirect('/admin/brands?updated=true') 
        
        return res.json({ success: true, message: 'Brand updated successfully!' })

    } catch (error) {
        console.log("Error editing brand:",error)
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