import Product from '../../models/productSchema.js'
import Category from '../../models/categorySchema.js'

const addProductOffer1 = async (req,res)=>{
    try {
        const {productId,percentage}  = req.body

        if (!percentage || percentage < 1 || percentage > 90) {
            return res.status(400).json({ 
                status: false, 
                message: 'Percentage must be between 1 and 90' 
            });
        }

        const findProduct = await Product.findById(productId);
        if (!findProduct) {
            return res.status(404).json({ 
                status: false, 
                message: 'Product not found' 
            });
        }
        //checking if category offers is there
        const findCategory = await Category.findById(findProduct.category);
        if (findCategory && findCategory.categoryOffer > percentage) {
            return res.json({ 
                status: false, 
                message: 'This product\'s category already has an offer. Greater than your new offer' 
            });
        }

        const category = await Category.findById(findProduct.category);

        findProduct.productOffer = percentage;
        findProduct.salesPrice = getFinalPrice(findProduct, category);

        await findProduct.save();

        res.json({ 
            status: true, 
            message: 'Product offer added successfully',
            newPrice: findProduct.salesPrice 
        });
          
    } catch (error) {
        console.error("Add Product Offer Error:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
}



const getOfferManagement = async(req,res)=>{
    try {
        const page= parseInt(req.query.page) || 1
        const limit = 5
        const search = req.query.search || ''
        const filterType = req.query.filterType || 'all'

        let query ={}

        if(filterType === 'product'){
            query ={productOffer:{$gte:0}}

            if(search){
                query.productName = { $regex: search, $options: 'i' };
            }

            const products = await Product.find(query)
            .populate('category','name')
            .sort({createdAt:-1})
            .skip((page-1)*limit)
            .limit(limit)

            const totalProducts = await Product.countDocuments(query)
            const totalPages = Math.ceil(totalProducts/limit)

            
        console.log(products)

            return res.render('admin/offerManagement',{
                products,
                categories: [],
                filterType,
                search,
                currentPage: page,
                totalPages
            })
  
        }else if(filterType === 'category'){
            query ={ categoryOffer:{$gte:0}}

            if(search){
                query.name = { $regex: search, $options: 'i' };
            }

            const categories = await Category.find(query)
            .sort({createdAt:-1})
            .skip((page-1)*limit)
            .limit(limit)

            const totalCategories = await Category.countDocuments(query)
            const totalPages = Math.ceil(totalCategories/limit)
             

            return res.render('admin/offerManagement',{
                products:[],
                categories,
                filterType,
                search,
                currentPage: page,
                totalPages
            })
        }else{
            const productQuery ={productOffer:{$gte:0}} 
            const categoryQuery  ={ categoryOffer:{$gte:0}} 

            if(search){ 
                productQuery.productName = { $regex: search, $options: 'i' };
                categoryQuery.name = { $regex: search, $options: 'i' };
            }
            const products = await Product.find(productQuery)
            .populate('category','name')
            .sort({createdAt:-1}) 
            .skip((page-1)*limit)
            .limit(5)

            const categories = await Category.find(categoryQuery)
            .sort({createdAt:-1}) 
            .skip((page-1)*limit)
            .limit(5)

            const totalProducts = await Product.countDocuments(productQuery)
            const totalCategories = await Category.countDocuments(categoryQuery)
 
            const totalPages = Math.max(Math.ceil(totalProducts/limit),Math.ceil(totalCategories/limit))
            
        console.log(products,categories,filterType,search,page)

            return res.render('admin/offerManagement',{
                products,
                categories,
                filterType,
                search,
                currentPage: page,
                totalPages:totalPages
            })


        }
    } catch (error) {
        console.error("Offer Management Load Error:", error);
        res.redirect('/admin/pageError');
    }   
}
  
const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;

        if (!percentage || percentage < 1 || percentage > 90) {
            return res.status(400).json({
                status: false,
                message: "Percentage must be between 1 and 90"
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const category = await Category.findById(product.category);
 
        product.productOffer = percentage;
        product.salesPrice = getFinalPrice(product, category);

        await product.save();

        res.json({
            status: true,
            message: "Product offer added successfully",
            newPrice: product.salesPrice
        });

    } catch (error) {
        console.error("Add Product Offer Error:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

const removeProductOfferPage =  async (req, res) => {
    try {
        const { productId } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const category = await Category.findById(product.category);

        product.productOffer = 0;
        product.salesPrice = getFinalPrice(product, category);

        await product.save();

        res.json({ 
            status: true, 
            message: 'Product offer removed successfully' 
        });
    } catch (error) {
        console.error("Remove Product Offer Error:", error);
        res.status(500).json({ status: false, message: "Internal server error" })
    }
}

const addCategoryOffer =  async (req,res) => {
    try { 
        const { percentage, categoryId } = req.body;

        if (!percentage || percentage < 1 || percentage > 90) {
            return res.status(400).json({ 
                status: false, 
                message: 'Percentage must be between 1 and 90' 
            });
        }
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ 
                status: false, 
                message: 'Category not found' 
            });
        }

        
        const products = await Product.find({ category: category._id });
 
        category.categoryOffer = percentage;
        await category.save();

        for (const product of products) {
            product.salesPrice = getFinalPrice(product, category);
            await product.save();
        }
        res.json({ 
            status: true, 
            message: `Category offer added successfully. ${products.length} products updated.` 
        });

    } catch (error) {
        console.error("Add Category Offer Error:", error);
        res.status(500).json({ status: false, message: 'Internal server error' })
    }
}
 
const removeCategoryOfferPage = async (req, res) => {
    try {
        const {categoryId} = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ 
                status: false, 
                message: 'Category not found' 
            });
        }

        const products = await Product.find({ category: category._id });
 
        category.categoryOffer = 0
        await category.save()

        for (const product of products) {
            product.salesPrice = getFinalPrice(product, category);
            await product.save();
        }

        res.json({ 
            status: true, 
            message: `Category offer removed successfully. ${products.length} products updated.` 
        });

    } catch (error) {
        console.error("Remove Category Offer Error:", error);
        res.status(500).json({ status: false, message: 'Internal server error' })
    }
}

const editProductOffer = async (req,res) => {
    try {
        const {productId,percentage} = req.body
        
        if (!percentage || percentage < 1 || percentage > 90) {
            return res.status(400).json({ 
                status: false, 
                message: 'Percentage must be between 1 and 90' 
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ 
                status: false, 
                message: 'Product not found' 
            });
        }

        const category = await Category.findById(product.category);

        product.productOffer = percentage;
        product.salesPrice = getFinalPrice(product, category);

        await product.save();

        res.json({ 
            status: true, 
            message: 'Product offer updated successfully',
            newPrice: product.salesPrice 
        })


    } catch (error) {
        console.error("Edit Product Offer Error:", error);
        res.status(500).json({ status: false, message: "Internal server error" })
    }
}

const editCategoryOffer = async (req, res) => {
    try {
        const { categoryId, percentage } = req.body

        if(!percentage || percentage < 1 || percentage > 90) {
            return res.status(400).json({ 
                status: false, 
                message: 'Percentage must be between 1 and 90' 
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ 
                status: false, 
                message: 'Category not found' 
            });
        }

        
        const products = await Product.find({ category: category._id })
        
        category.categoryOffer = parseInt(percentage);
        await category.save()

        for (const product of products) {
            product.salesPrice = getFinalPrice(product, category);
            await product.save();
        }

        res.json({ 
            status: true, 
            message: `Category offer updated successfully. ${products.length} products updated.` 
        })

    } catch (error) {
        console.error("Edit Category Offer Error:", error);
        res.status(500).json({ status: false, message: "Internal server error" })
    }
}

function getFinalPrice(product, category) {
    const PO = product.productOffer || 0;
    const CO = category?.categoryOffer || 0;
    const regularPrice = product.regularPrice;

    const bestOffer = Math.max(PO, CO);
    return regularPrice - Math.floor(regularPrice * (bestOffer / 100));
}


export {
    getOfferManagement,
    addProductOffer,
    removeProductOfferPage,
    addCategoryOffer,
    removeCategoryOfferPage,
    editProductOffer,
    editCategoryOffer
}