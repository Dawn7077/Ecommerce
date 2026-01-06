const User = require('../models/userSchema')

// const userAuth = (req,res,next)=>{
//     if(req.session.user){
//         User.findById(req.session.user._id)
//         .then(data=>{
//             if(data&& !data.isBlocked){
//                 next()
//             }else{
//                 res.redirect('/login')
//             }
//         })
//         .catch(error=>{
//             console.log('Error in user auth middleware',error);
//             res.status(500).send('Internal server error')
            
//         })
//     }else{
//         res.redirect('/login')
//     }
// }

const userAuth = async(req,res,next)=>{
    try {
        if(req.session.user){
            const user = await User.findById(req.session.user._id)
            
            
            if (!user || user.isBlocked) {
                req.session.destroy()

                if(req.xhr || req.headers.accept?.includes('application/json')){
                    return res.status(401).json({status:false, message:"User Blocked or not found"})
                }
                return res.redirect('/login');
            }
            return next()  
        }else{
            if(req.xhr || req.headers.accept?.includes('application/json')){
                console.log('guest req hit..........')
                return res.status(401).json({status:false, message:"Please login to continue."})
            }
            return res.redirect('/login')
        }
    } catch (error) {
        console.log('Error in user auth middleware',error);
          if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, message: "Server error" });
        }
        return res.status(500).send('Internal server error')
    }

}

const isloggedOut = (req,res,next)=>{
    if(!req.session.user){
        next()  
    }else{
        return res.redirect('/')
    }
}

// const adminAuth = (req,res,next)=>{
//     User.findOne({isAdmin:true})
//     .then(data=>{
//         if(data){
//             next()
//         }else{
//             res.redirect('/admin/login')
//         }
//     }).catch(error=>{
//         console.log("Error in admin auth middleware",error);
//         res.status(500).send("Internal server error")
        
//     })
// }

const adminAuth =  (req,res,next)=>{
    if(req.session.admin){
        next()
    }else{
        res.redirect('/admin/login')
    }
}

module.exports = {
    userAuth,
    adminAuth,
    isloggedOut
}