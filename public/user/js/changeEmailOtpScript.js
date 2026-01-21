
function startOTPTimer(durationInSeconds) {
let timer = durationInSeconds;
const timerElement = document.getElementById('otpTimer');
const countdown = setInterval(function () {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;


    timerElement.textContent = `OTP Expires in: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;


    if (--timer < 0) {
    clearInterval(countdown);
    timerElement.textContent = 'OTP Expired';
    }
}, 1000);
}


function resendOTP() {
$.ajax({
    type: 'POST',
    url: '/resend-otp',
    success: function (response) {
    if (response.success) {
        startOTPTimer(60);
    } else {
        alert('Failed to resend OTP. Please try again.');
    }
    },
    error: function () {
    alert('Error occurred while resending OTP. Please try again.');
    }
});
}
startOTPTimer(60);

