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

        let highlights =[]
            if(Array.isArray(products.highlights)){
                highlights = products.highlights.filter(h=>h.trim()!=='')
            }else if(products.highlights && products.highlights.trim()!==''){
              highlights = [products.highlights.trim()]
            }
            console.log('highlights:',highlights)
            

        const productExists = await Product.findOne({
            productName:{$regex:`^${products.productName}$`,$options:'i'},
        })
        if(!productExists){
            const images = []//adding imgs
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

            //adding variants
            const colors =req.body.color
            const sizes =req.body.size
            const stocks =req.body.stock

            const variants =[]

            if(Array.isArray(colors)){
              for(let i=0; i< colors.length; i++){
                const color = colors[i]?.trim()
                const size = sizes[i]?.trim()
                const stockValue = Number(stocks[i])

                if(!color && !size && !stock) continue 

                if (!color || !size) {
                  console.log("Skipped incomplete variant row");
                  continue;
                }

                if(isNaN(stockValue || stockValue < 0 )){
                  console.log("Invalid stock value:", stockValue);
                  continue
                }


                variants.push({color,size,stock:stockValue})

              }
            }

            

            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                brand:products.brand,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salesPrice:products.salePrice,
                createdAt: new Date(),  
                productImage:images,
                highlights:highlights,
                variants,
                status:'Available'
 
            })

            await newProduct.save()
            console.log(`---!!! Product "${products.productName}" added successfully!`);
            return res.json({status:true,message:'Product added successfully'})

        }
        else{
           return res.status(400).json({status:false,message:'Product already exists, please try with another name'})
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
    const updated = req.query.updated === 'true' 
    const limit = 4
    const productData = await Product.find({
      $or:[
        {productName:{$regex: new RegExp('.*'+search+'.*','i')}},

        {brand:{$regex: new RegExp('.*'+search+'.*','i')}}
      ],
    }).sort({createdAt:-1})
    .limit((limit*1)).skip((page-1)*limit).populate('category').exec()

    // totalStock 
    productData.forEach(p=>{
      p.totalStock = p.variants.reduce((sum,v)=> sum+(v.stock || 0 ),0)
    })


    const noCategoryProducts = await Product.find({ category: { $size: 0 }});
    console.log(noCategoryProducts);
 
    productData.status = productData.totalStock > 0 ? "Available" : "Out of Stock";


    const count = await Product.find({
      $or:[
        {productName:{$regex: new RegExp('.*'+search+'.*','i')}},

        {brand:{$regex: new RegExp('.*'+search+'.*','i')}}
      ],
    }).countDocuments()

    const category = await Category.find({isListed:true})
    const brand = await Brand.find({isBlocked:false})
    // console.log(productData.category.name,"====cat===> ",category)
    if(category && brand){
      res.render('admin/products',{
        data:productData,
        currentPage:page,
        totalPages:page,
        totalPages:Math.ceil((count/limit)),
        cat:category,
        brand:brand,
        search,
        updated
      })
    }else{
      res.render('/admin/pageError')
    }
    

  } catch (error) {
    res.redirect('/admin/pageError')
  }
}

const addProductOffer = async(req,res)=>{
  try {
    const {productId,percentage} = req.body
    const findProduct = await Product.findOne({_id:productId})
    // const findCategory = await Category.findOne({_id:findProduct.category})

    // if(findCategory.categoryOffer>percentage){
    //   return res.json({status:false,message:'This product category has a category offer'})

    // }
    findProduct.productOffer = parseInt(percentage)
    findProduct.salesPrice = findProduct.salesPrice - Math.floor(findProduct.regularPrice*(percentage/100))
    
    await findProduct.save()
    // findCategory.categoryOffer = 0
    // await findCategory.save()
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
    const page = req.query.page || 1
    const product = await Product.findOne({_id:id})
    const category =await Category.find({})
    const brand = await Brand.find({})
    res.render('admin/edit-product',{
      product,
      cat:category,
      brand,
      page
    })
  } catch (error) {
    res.redirect('/pageError')
  }
}
 
const editProduct =async(req,res)=>{
  try {
    const id = req.query.id
    const page = req.query.page || 1
    const product = await Product.findOne({_id:id})
    const data = req.body
    const existingProduct = await Product.findOne({
      productName:data.productName,
      _id:{$ne:id}
    })
    if(existingProduct){
      return res.status(400).json({error:'Product with this name already exists, please try with another one'})
    }

    let highlights =[]

    if(Array.isArray(data.highlights)){
        highlights = data.highlights.filter(h=>h.trim()!=='')
    }else if(data.highlights && data.highlights.trim()!==''){
      highlights = [data.highlights.trim()]
    }

    

    const images =[]

    if(req.files && req.files.length>0){
      for(let i=0;i<req.files.length;i++){
        images.push(req.files[i].filename)
      }
    }

    // Handle variants
    const colors = req.body.color;
    const sizes = req.body.size;
    const stocks = req.body.stock;

    const variants = [];

    if (Array.isArray(colors)) {
        for (let i = 0; i < colors.length; i++) {
            const color = colors[i]?.trim();
            const size = sizes[i]?.trim();
            const stockValue = Number(stocks[i]);

            if (!color && !size && !stocks[i]) continue;
            if (!color || !size) continue;
            if (isNaN(stockValue) || stockValue < 0) continue;

            variants.push({ color, size, stock: stockValue });
        }
    }


    const updateFields ={
      productName:data.productName,
      description:data.descriptionData,
      brand:data.brand,
      category:[data.category],
      regularPrice:data.regularPrice,
      salesPrice:data.salePrice,
      variants : variants,
      highlights:highlights
    }
    if(req.files &&req.files.length>0){
      updateFields.$push = {productImage:{$each:images}}
    }
    if(data.productOffer!==undefined && data.productOffer!==''){
      updateFields.productOffer = parseInt(data.productOffer)
    }

    await Product.findByIdAndUpdate(id,updateFields,{new:true})
    res.redirect(`/admin/products?page=${page}&updated=true`) 

  } catch (error) {
    console.error(error)
    res.redirect('/admin/pageError')
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

const deleteProduct = async(req,res)=>{
  try {
    const id = req.query.id
    if(!id){
      return res.status(400).json({status:false,message:'Product id is required'})
    }
    await Product.deleteOne({_id:id})
    res.json({status:true,message:'Product deleted successfully'})
  } catch (error) {
    console.log("Error deleting product:",error)
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
    deleteProduct
}