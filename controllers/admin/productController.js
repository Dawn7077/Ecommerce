//productController.js
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const Brand = require('../../models/brandSchema')
const User =require('../../models/userSchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const getProductAddPage= async(req,res)=>{
    try {
        const category = await Category.find({isListed:true})
        const brand = await Brand.find({isBlocked:false})
        res.render('admin/product-add',{
            cat:category,
            brand
        })
    } catch (error) {
        console.log('Error has occured in getProductPage',error)
        res.redirect('/admin/pageError')
    }
}

const addProducts = async(req,res)=>{
    try {
        const products = req.body
        const productExists = await Product.findOne({
            productName:products.productName,
        })
        if(!productExists){
            const images = []
            if(req.files && req.files.length>0){
                for(let i=0; i<req.files.length; i++){
                    const originalImagePath = req.files[i].path
                    const resizedImageName = `resize-${req.files[i].filename}`
                    const resizedImagePath = path.join('public','uploads','product-image',resizedImageName)

                    try {
                        const imageBuffer = fs.readFileSync(originalImagePath)

                        await sharp(imageBuffer)
                        .resize({width:440,height:440})
                        .toFile(resizedImagePath)

                        images.push(resizedImageName)

                        setTimeout(()=>{
                            fs.unlink(originalImagePath,(err)=>{
                                if(err)console.warn(`Could not delete ${originalImagePath}:`,err.message)
                            })


                        },500)
                    } catch (error) {
                        console.error(`Error processing image ${req.files[i].filename}:`, err.message)
                    }
  
                }
            }

            const categoryId = await Category.findOne({name:products.category})
            if(!categoryId){
                return res.status(400).json('Invalid category name')
            }

            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                brand:products.brand,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salesPrice:products.salePrice,
                createdAt: new Date(),
                quantity:products.quantity,
                size:products.size,
                color:products.color,
                productImage:images,
                status:'Available'
 
            })

            await newProduct.save()
            console.log(`---!!! Product "${products.productName}" added successfully!`);
            return res.redirect('/admin/addProducts')

        }
        else{
           return res.status(400).json('Product already exists, please try with another name')
        }
    } catch (error) {
        console.error("Error saving product",error);
        return res.redirect('/admin/pageError')
    }
}
// const addProducts1 = async (req, res) => {
//   try {
//     const products = req.body;

//     // Check if product already exists
//     const productExists = await Product.findOne({ productName: products.productName });
//     if (productExists) {
//       return res.status(400).json('Product already exists, please try with another name');
//     }

//     const images = [];

//     // ✅ Process uploaded files if any
//     if (req.files && req.files.length > 0) {
//       for (let i = 0; i < req.files.length; i++) {
//         const originalImagePath = req.files[i].path;
//         const resizedImageName = `resize-${req.files[i].filename}`;
//         const resizedImagePath = path.join('public', 'uploads', 'product-images', resizedImageName);

//         try {
//           // Read file into memory to avoid Sharp file lock issue on Windows
//           const imageBuffer = fs.readFileSync(originalImagePath);

//           // Resize and save new image
//           await sharp(imageBuffer)
//             .resize({ width: 440, height: 440 })
//             .toFile(resizedImagePath);

//           // Push the resized image filename to the array
//           images.push(resizedImageName);

//           // Delete the original after a short delay (to avoid EPERM locks)
//           setTimeout(() => {
//             fs.unlink(originalImagePath, (err) => {
//               if (err) console.warn(`Could not delete ${originalImagePath}:`, err.message);
//             });
//           }, 500);
//         } catch (err) {
//           console.error(`Error processing image ${req.files[i].filename}:`, err.message);
//         }
//       }
//     }

//     // ✅ Check if category exists
//     const categoryDoc = await Category.findOne({ name: products.category });
//     if (!categoryDoc) {
//       return res.status(400).json('Invalid category name');
//     }

//     // ✅ Create and save new product
//     const newProduct = new Product({
//       productName: products.productName,
//       description: products.description,
//       brand: products.brand,
//       category: categoryDoc._id,
//       regularPrice: products.regularPrice,
//       salesPrice: products.salePrice,
//       createdAt: new Date(),
//       quantity: products.quantity,
//       size: products.size,
//       color: products.color,
//       productImage: images,
//       status: 'Available'
//     });

//     await newProduct.save();

//     console.log(`✅ Product "${products.productName}" added successfully!`);
//     return res.redirect('/admin/addProducts');

//   } catch (error) {
//     console.error("  Error saving product:", error);
//     return res.redirect('/admin/pageError');
//   }
// };

const getAllProducts = async(req,res)=>{
  try {
    const search = req.query.search || ''
    const page = req.query.page || 1
    const limit = 4
    const productData = await Product.find({
      $or:[
        {productName:{$regex: new RegExp('.'+search+'.*','i')}},

        {brand:{$regex: new RegExp('.'+search+'.*','i')}}
      ],
    }).limit((limit*1)).skip((page-1)*limit).populate('category').exec()

    const count = await Product.find({
      $or:[
        {productName:{$regex: new RegExp('.'+search+'.*','i')}},

        {brand:{$regex: new RegExp('.'+search+'.*','i')}}
      ],
    }).countDocuments()

    const category = await Category.find({isListed:true})
    const brand = await Brand.find({isBlocked:false})

    if(category && brand){
      res.render('admin/products',{
        data:productData,
        currentPage:page,
        totalPages:page,
        totalPages:Math.ceil((count/limit)),
        cat:category,
        brand:brand,
      })
    }else{
      res.render('admin/pageError')
    }
    

  } catch (error) {
    res.redirect('admin/pageError')
  }
}

const addProductOffer = async(req,res)=>{
  try {
    const {productId,percentage} = req.body
    const findProduct = await Product.findOne({_id:productId})
    const findCategory = await Category.findOne({_id:findProduct.category})

    if(findCategory.categoryOffer>percentage){
      return res.json({status:false,message:'This product category has a category offer'})

    }
    findProduct.salesPrice = findProduct.salesPrice - Math.floor(findProduct.regularPrice*(percentage/100))
    findProduct.productOffer = parseInt(percentage)
    
    await findProduct.save()
    findCategory.categoryOffer = 0
    await findCategory.save()
    res.json({status:true})
  } catch (error) {
    res.redirect('/pageError')
    res.status(500).json({status:false,message:"Internal server error"})
  }
}
const removeProductOffer= async(req,res)=>{
  try {
    const {productId} =req.body
    const findProduct = await Product.findOne({_id:productId})
    const percentage = findProduct.productOffer
    findProduct.salesPrice = findProduct.salesPrice + Math.floor(findProduct.regularPrice*(percentage/100))
    findProduct.productOffer = 0 
    await findProduct.save()
    res.json({status:true})
  }
   catch (error) {
    res.redirect('/pageError')
    res.status(500).json({status:false,message:"Internal server error"})
  }
}
const blockProduct = async(req,res)=>{
  try {
    const id = req.query.id
    await Product.updateOne({_id:id},{$set:{isBlocked:true}})
    res.redirect('/admin/products')
  } catch (error) {
    res.redirect('/pageError')
  }
}
const unBlockProduct = async(req,res)=>{
  try {
    const id = req.query.id
    await Product.updateOne({_id:id},{$set:{isBlocked:false}})
    res.redirect('/admin/products')
  } catch (error) {
    res.redirect('/pageError')
  }
}

const getEditProduct =async(req,res)=>{
  try {
    const id = req.query.id
    const product = await Product.findOne({_id:id})
    const category =await Category.find({})
    const brand = await Brand.find({})
    res.render('admin/edit-product',{
      product,
      cat:category,
      brand
    })
  } catch (error) {
    res.redirect('/pageError')
  }
}


const editProduct =async(req,res)=>{
  try {
    const id = req.query.id
    const product = await Product.findOne({_id:id})
    const data = req.body
    const existingProduct = await Product.findOne({
      productName:data.productName,
      _id:{$ne:id}
    })
    if(existingProduct){
      return res.status(400).json({error:'Product with this name already exists, please try with another one'})
    }

    const images =[]

    if(req.files && req.files.length>0){
      for(let i=0;i<req.files.length;i++){
        images.push(req.files[i].filename)
      }
    }

    const updateFields ={
      productName:data.productName,
      description:data.descriptionData,
      brand:data.brand,
      category:product.category,
      regularPrice:data.regularPrice,
      salesPrice:data.salePrice,
      quantity:data.quantity,
      size:data.size,
      color:data.color
    }
    if(req.files.length>0){
      updateFields.$push = {productImage:{$each:images}}
    }

    await Product.findByIdAndUpdate(id,updateFields,{new:true})
    res.redirect('/admin/products')

  } catch (error) {
    console.error(error)
    res.redirect('/pageError')
  }
}

const deleteSingleImage = async(req,res)=>{
  try {
    const {imageNametoServer,productIdtoServer}= req.body
    const product =await Product.findByIdAndUpdate(productIdtoServer,{$pull:{
      productImage:imageNametoServer
    }})
    const imagePath = path.join('public','uploads','product-image',imageNametoServer)
    if(fs.existsSync(imagePath)){
      await fs.unlinkSync(imagePath)
      console.log(`Image ${imageNametoServer} deleted successfully`);
      
    }else{
      console.log(`Image ${imageNametoServer} not found`);
    }

    res.send({status:true})

  } catch (error) {
    res.redirect('/pageError')
  }
}

module.exports={
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
}