export function generateReferralCode(name){
    const prefix = name.split(" ")[0].substring(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
}

export function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString()
}

export const isStrongPassword = (password) => {
  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  return strongPassword.test(password);
};
