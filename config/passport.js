const passport = require('passport')
const GoogleStrategy  = require("passport-google-oauth20").Strategy
const User = require('../models/userSchema')
const env = require('dotenv').config()

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'/auth/google/callback'
},
async (accessToken,refreshToke,profile,done)=> {
    try {
        let existingUser= await User.findOne({email:profile.emails[0].value})
        console.log( 'existing user ::',existingUser);
         
            if(existingUser){
                if(existingUser.isBlocked){
                    return done(null, false, { message: "User is blocked by admin" });
                }
                if( !existingUser.googleId){
                return done(null,false,{message:"This email is registered with password login. Please login normally1."})
                }
                 
                if (existingUser && existingUser.isGoogleUser) {
                    return done(null, false, { message: "This email is registered with password login. Please login normally2." });
                }

                
                 
                return done(null, existingUser);
            }

       
        // let user = await User.findOne({googleId:profile.id})
        // if(user){
        //     if(user.isBlocked){
        //         return done(null,false,{message:"User is blocked by admin"})
        //     }
        //     return done(null,user)
        // }else{
        //     user = new User({
        //         name:profile.displayName,
        //         email:profile.emails[0].value,
        //         googleId:profile.id,
        //         isGoogleUser:true
        //     })
        //     await user.save() 
        //     return done(null,user)
        // }

        const newUser = new User({  
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            isGoogleUser: true
        });
        await newUser.save();
        return done(null, newUser);

    } catch (error) {
        return done(error,null)

    }
}
)) 

passport.serializeUser((user,done)=>{
    done(null,user.id)
})

passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user=>{
        done(null,user)
    })
    .catch(err=>{
        done(err,null)
    })
})

module.exports = passport