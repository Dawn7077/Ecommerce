import nodemailer from 'nodemailer'

export async function sendVerificationEmail(email,otp){
    try {
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })  

        const info = await transporter.sendMail({
            from: `"Kickshop Security" <${process.env.NODEMAILER_EMAIL}>`,
            to:email,
            subject: "Your OTP for account verification",
            text:`Your OTP is ${otp}`,
            // html:`<b>Your OTP:${otp}</b>`
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px;">
                <h2>Verify your Kickshop account</h2>
                <p>Use the OTP below to complete your account verification:</p>
                <h3 style="letter-spacing: 2px;">${otp}</h3>
                <p>This code is valid for <strong>5 minutes</strong>.</p>
                <hr>
                <p style="font-size: 12px; color: #777;">
                    If you did not request this verification, please ignore this email.
                </p>
                </div>
            `
        })

        return info.accepted.length>0

    } catch (error) {
        console.error('Error sending email',error)
        return false
    }
}