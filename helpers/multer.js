//helpers/multer.js
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import { fileTypeFromFile } from 'file-type'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/product-image'))
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname)
    }
})

const fileFilter = (req, file, cb) => {
    // const allowedTypes = /jpeg|jpg|png|webp/;
    // const mimetype = allowedTypes.test(file.mimetype);
    // const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = /jpeg|jpg|png|webp/;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

    // if (mimetype && extname) { 
    if (allowedMimeTypes.includes(file.mimetype) && extname) { 
        return cb(null, true);
    }
    // cb(new Error("Only images (jpeg, jpg, png, webp) are allowed"));
    cb(new Error(`Invalid file type. Only JPEG, PNG, and WEBP images are allowed. Received: ${file.mimetype}`));

};

const uploads = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

const uploadredirect = (error, req, res, next) => {
        // Handle multer errors
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    status: false,
                    message: 'File too large. Maximum size is 5MB per image.'
                });
            }
            if (error.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    status: false,
                    message: 'Too many files. Maximum 4 images allowed.'
                });
            }
            return res.status(400).json({
                status: false,
                message: error.message
            });
        }
        
        // Handle custom fileFilter errors
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.message
            });
        }
        
        next();
    }

const validateFileTypes = async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        if (!req.file) {
            return next();  
        } 
        req.files = [req.file];
    }

    try {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        
        for (const file of req.files) { 
            const detectedType = await fileTypeFromFile(file.path);
            
            if (!detectedType) { 
                fs.unlinkSync(file.path);
                return res.status(400).json({
                    status: false,
                    message: `Invalid file detected: ${file.originalname}. Could not determine file type.`
                });
            }
            
            if (!allowedTypes.includes(detectedType.mime)) { 
                fs.unlinkSync(file.path);
                return res.status(400).json({
                    status: false,
                    message: `Invalid image type: ${file.originalname}. Detected as ${detectedType.mime}. Only JPEG, PNG, and WEBP allowed.`
                });
            }
            
            console.log(`✓ File validated: ${file.originalname} (${detectedType.mime})`);
        }
        
        next();
    } catch (error) {
        console.error('File validation error:', error);
         
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        
        return res.status(500).json({
            status: false,
            message: 'Error validating uploaded files'
        });
    }
}

export {
    uploads,
    uploadredirect,
    validateFileTypes
} 