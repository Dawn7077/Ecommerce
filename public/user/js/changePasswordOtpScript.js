

let otpTimerInterval;
let timer = 60;


function updateTimerColor(percentage){
const timerElement = document.getElementById('otpTimer');
if(percentage > 50){
    timerElement.style.backgroundColor = '#28a745';


}else if(percentage>25){
    timerElement.style.backgroundColor = '#ffc107';
}else {
    timerElement.style.backgroundColor = '#dc3545';
}
}


function startOtpTimer(){
const timerElement = document.getElementById('otpTimer');
otpTimerInterval = setInterval(function(){
    const minutes = Math.floor(timer/60);
    const seconds = timer % 60;
    timerElement.textContent = `${minutes}:${seconds < 10?'0':''}${seconds}`;
    updateTimerColor((timer/60)*100);
    if(--timer <0){
    clearInterval(otpTimerInterval);
    timerElement.textContent = 'Expired';
    timerElement.style.backgroundColor = 'red';
    }
},1000);
}


initializeOtpTimer();








function initializeOtpTimer(){
clearInterval(otpTimerInterval);
timer = 60;
startOtpTimer();
}


function validateOtpForm(){
const otpInput = document.getElementById('otp').value;
$.ajax({
    type:'POST',
    url:'/verify-changepassword-otp',
    data:{otp:otpInput},
    success: function(response){
    if(response.success){
        Swal.fire({
        icon:'success',
        title:'OTP Verified Successfully',
        showConfirmButton:false,
        timer:1500


        }).then(()=>{
        window.location.href = response.redirectUrl;
        })
    }else {
        Swal.fire({
        icon:'error',
        title:'Invalid OTP',
        text:response.message


        })
    }
    },
    error: function (){
    Swal.fire({
        icon:'error',
        title:'Error',
        text:'Failed to verify OTP. Please try again.'


    })
    }




});
return false
}


function resendOtp(){
clearInterval(otpTimerInterval);
timer = 60;
startOtpTimer();
$.ajax({


type:'POST',
url:'/resend-changepassword-otp',
success: function (response){
    if(response.success){
    Swal.fire({
        icon:'success',
        title:'Resend OTP Successful',
        showConfirmButton:false,
        timer:1500,


    })
    }else {
    Swal.fire({
        icon:'error',
        title:'Error',
        text:'Failed to resend OTP. Please try again.'




    })
    }
},
error: function (){


    Swal.fire({
    icon:'error',
    title:'Error',
    text:'Failed to resend OTP. Please try again.'


    })


}


})
}

