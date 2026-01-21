

const nameId = document.getElementById("name")
const emailId = document.getElementById("email")
const phoneId = document.getElementById("phone")
const passwordId = document.getElementById("password")
const cPasswordId = document.getElementById("confirm-password")

const error1 = document.getElementById("error1")
const error2 = document.getElementById("error2")
const error3 = document.getElementById("error3")
const error4 = document.getElementById("error4")
const error5 = document.getElementById("error5")
const signform = document.getElementById("signform")

function nameValidateCheck(e){
const nameVal = nameId.value
const namePattern = /^[A-Za-z\s]+$/

if(nameVal.trim()==="") {
    error1.style.display="block"
    error1.innerHTML= "please enter a valid name"
}else if(!namePattern.test(nameVal)){
    error1.style.display = "block"
    error1.innerHTML= "Name can only contain letters and space"
}else{
    error1.style.display = "none"
}
    
}

function emailValidateCheck(e){
const emailVal = emailId.value
const emailPattern1 = /^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/
const emailPattern= /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})?$/
if(!emailPattern.test(emailVal)){
    error2.style.display ="block"
    error2.innerHTML= 'Invalid format'
}else{
    error2.style.display= "none"
    error2.innerHTML=''
}
}

function phoneValidateCheck(e){
const phoneVal = phoneId.value

if(phoneVal.trim()===''){
    error3.style.display = 'block'
    error3.innerHTML ='Enter valid phone number'
}else if(phoneVal.length<10||phoneVal.length>10){
    error3.style.display = 'block'
    error3.innerHTML = 'Enter 10 digit'
}else{
    error3.style.display = 'none'
    error3.innerHTML= ''
}
}

function passwordValidateCheck(e){
const passwordVal = passwordId.value
const cPasswordVal = cPasswordId.value


const upper = /[A-Z]/;
const lower = /[a-z]/;
const digit = /\d/
const special = /[!@#$%^&*(),.?":{}|<>]/;

if(passwordVal.length<8){
    error4.style.display= "block"
    error4.innerHTML = 'should contain atleast 8 characters'
}else if(
    !upper.test(passwordVal) ||
    !lower.test(passwordVal) ||
    !digit.test(passwordVal) ||
    !special.test(passwordVal)
){
    error4.style.display = 'block'
    error4.innerHTML= 'should contain 1 Capital letter,1 Small letter, 1 num and special char'
}else{
    error4.style.display ='none'
    error4.innerHTML = ''
}
if(passwordVal!==cPasswordVal){
    error5.style.display= 'block'
    error5.innerHTML= 'Passwords do not match'
}else{
    error5.style.display= 'none'
    error5.innerHTML=''
}
}



document.addEventListener('DOMContentLoaded',()=>{
signform.addEventListener('submit',(e)=>{
    nameValidateCheck() 
    emailValidateCheck() 
    phoneValidateCheck() 
    passwordValidateCheck()  

    if(!nameId||!emailId||!phoneId||!passwordId||!error1||!error2||!error3||!error4||!error5||
    !signform
    ){
    console.error("One or more elements not found")
    }

    if(error1.innerHTML||
    error2.innerHTML||
    error3.innerHTML||
    error4.innerHTML||
    error5.innerHTML
    ){
    e.preventDefault()//to prevent default submission of form
    }

})
})

function togglePassword(inputId, icon) {
const input = document.getElementById(inputId);
if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
} else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
}
}
