const passport = require('passport')
const GoogleStrategy = require("passport-google-oauth20").Strategy
const User = require('../models/userSchema')
const env = require('dotenv').config()

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
},
    async (accessToken, refreshToke, profile, done) => {
        try {
            let existingUser = await User.findOne({ email: profile.emails[0].value })

            if (existingUser) {
                if (existingUser.isBlocked) {
                    return done(null, false, { message: "User is blocked by admin" });
                }
                if (existingUser.googleId) {
                    return done(null, existingUser);
                } else {
                    return done(null, false, { message: "This email is registered with password login. Please login normally." });
                }
            }

            // Generate a referral code for the new user
            const generateReferralCode = (name) => {
                const prefix = name.split(" ")[0].substring(0, 4).toUpperCase();
                const random = Math.random().toString(36).substring(2, 8).toUpperCase();
                return `${prefix}-${random}`;
            };

            let referralCode = generateReferralCode(profile.displayName);
            while (await User.findOne({ referalCode: referralCode })) {
                referralCode = generateReferralCode(profile.displayName);
            }

            const newUser = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                isGoogleUser: true,
                referalCode: referralCode
            });
            await newUser.save();
            return done(null, newUser);

        } catch (error) {
            return done(error, null)
        }
    }
))

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            done(null, user)
        })
        .catch(err => {
            done(err, null)
        })
})

module.exports = passport