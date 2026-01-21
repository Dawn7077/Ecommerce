import Brand from '../../models/brandSchema.js'

export const getBrandsPagination = async (search,skip,limit) => {
    return await Brand.find({
            brandName:{$regex: new RegExp('.*'+search+'.*','i')}
        })
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)
}

export const getBrandsCount  = async (search) => {
    return await Brand.countDocuments({
             brandName:{$regex: new RegExp('.*'+search+'.*','i')}
        })
}
export const findBrandByName   = async (brand) => {
    return await Brand.findOne({
            brandName:{$regex: new RegExp(`^${brand}$`,`i`)}
        })
}

export const findBrandByNameExcludingId = async (brandName,id) => {
    return await Brand.findOne({
        brandName: { $regex: new RegExp(`^${brandName}$`, 'i') },
        _id: { $ne: id }
    })
}

export const createBrand = async (brandName, brandImage) => {
    const newBrand = new Brand({
        brandName,
        brandImage
    })
    return await newBrand.save()
}

export const findBrandById = async (brandId) => {
    return await Brand.findById(brandId)
}


const updateBrandBlockStatus = async (brandId, isBlocked) => {
    return await Brand.updateOne(
        { _id: brandId }, 
        { $set: { isBlocked } }
    )
}

 
 
export const blockBrand = async (brandId) => {
    return await updateBrandBlockStatus(brandId, true)
}
 
export const unblockBrand = async (brandId) => {
    return await updateBrandBlockStatus(brandId, false)
}
 
export const updateBrandDetails = async (brandId, updateData) => {
    return await Brand.findByIdAndUpdate(
        brandId, 
        updateData, 
        { new: true }
    )
}
 
export const deleteBrandSer = async (brandId) => {
    return await Brand.deleteOne({ _id: brandId })
}