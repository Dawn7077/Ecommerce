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
                    const resizedImagePath = path.join('public','uploads','product-images',resizedImageName)
                    await sharp(originalImagePath)
                     .resize({width:440,height:440})
                     .toFile(resizedImagePath)
                    images.push(resizedImageName)
                    fs.unlink(originalImagePath,(err)=>{
                        if(err)console.warn(`Could not delete ${originalImagePath}:`,err.message)
                    })
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
const addProducts1 = async (req, res) => {
  try {
    const products = req.body;

    // Check if product already exists
    const productExists = await Product.findOne({ productName: products.productName });
    if (productExists) {
      return res.status(400).json('Product already exists, please try with another name');
    }

    const images = [];

    // ✅ Process uploaded files if any
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const originalImagePath = req.files[i].path;
        const resizedImageName = `resize-${req.files[i].filename}`;
        const resizedImagePath = path.join('public', 'uploads', 'product-images', resizedImageName);

        try {
          // Read file into memory to avoid Sharp file lock issue on Windows
          const imageBuffer = fs.readFileSync(originalImagePath);

          // Resize and save new image
          await sharp(imageBuffer)
            .resize({ width: 440, height: 440 })
            .toFile(resizedImagePath);

          // Push the resized image filename to the array
          images.push(resizedImageName);

          // Delete the original after a short delay (to avoid EPERM locks)
          setTimeout(() => {
            fs.unlink(originalImagePath, (err) => {
              if (err) console.warn(`Could not delete ${originalImagePath}:`, err.message);
            });
          }, 500);
        } catch (err) {
          console.error(`Error processing image ${req.files[i].filename}:`, err.message);
        }
      }
    }

    // ✅ Check if category exists
    const categoryDoc = await Category.findOne({ name: products.category });
    if (!categoryDoc) {
      return res.status(400).json('Invalid category name');
    }

    // ✅ Create and save new product
    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      brand: products.brand,
      category: categoryDoc._id,
      regularPrice: products.regularPrice,
      salesPrice: products.salePrice,
      createdAt: new Date(),
      quantity: products.quantity,
      size: products.size,
      color: products.color,
      productImage: images,
      status: 'Available'
    });

    await newProduct.save();

    console.log(`✅ Product "${products.productName}" added successfully!`);
    return res.redirect('/admin/addProducts');

  } catch (error) {
    console.error("❌ Error saving product:", error);
    return res.redirect('/admin/pageError');
  }
};

module.exports={
    getProductAddPage,
    addProducts,
}