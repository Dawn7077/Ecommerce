const Brand = require('../../models/brandSchema')
const Product =require('../../models/productSchema')

const getBrandPage = async(req,res)=>{
    try {
        const updated = req.query.updated
        const page = parseInt(req.query.page)||1
        const search = req.query.search || ''
        const limit = 4 
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
        res.redirect('/admin/pageError')
    }
}



const addBrand = async(req,res)=>{
    try {
        const brand =req.body.name
        const findBrand = await Brand.findOne({brandName:brand})

        if(!findBrand){
            const image = req.file.filename
            const newBrand =new Brand({
                brandName:brand,
                brandImage:image
            })
            await newBrand.save()
            res.redirect('/admin/brands')
        }
    } catch (error) {
        res.redirect('/admin/pageError')
    }
}

const blockBrand =async (req,res)=> {
    try {
        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/brands')
    } catch (error) {
        res.redirect('/admin/pageError')
    }
}
const unBlockBrand =async (req,res)=> {
    try {
        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/brands')
    } catch (error) {
        res.redirect('/admin/pageError')
    }
}
const deleteBrand =async (req,res)=> {
    try {
        const {id} = req.query
        if(!id){
            return res.status(400).redirect('/admin/pageError')
        }
        await Brand.deleteOne({_id:id})
        res.redirect('/admin/brands')
    } catch (error) {
        console.log("Error deletiing the brand",error); 
        return res.status(500).redirect('/admin/pageError')
    }
}
const editBrand = async(req,res)=>{
    try {
        const {brandId,name} = req.body
        let updateData = {
            brandName:name
        }
        if(req.file){
            updateData.brandImage = req.file.filename
        }

        await Brand.findByIdAndUpdate(brandId,updateData),
        res.redirect('/admin/brands?updated=true')
    } catch (error) {
        console.log("Error editing brand:",error)
    }
}


module.exports= {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand,
    editBrand,
}