
const emailid = document.getElementById("email");
const passid = document.getElementById("password");
const error1 = document.getElementById("error1");
const error2 = document.getElementById("error2");
const loginform = document.getElementById("loginform");

function emailValidateChecking(e) {
const emailval = emailid.value;
const emailpattern1 =
    /^[a-zA-Z0-9._-]+@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,4})$/;
const emailpattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})?$/


if (!emailpattern.test(emailval)) {
    error1.style.display = "block";
    error1.innerHTML = "Invalid Format";
} else {
    error1.style.display = "none";
    error1.innerHTML = "";
}
}

function passValidateChecking(e) {
const passval = passid.value;
if (passval.length < 8) {
    error2.style.display = "block";
    error2.innerHTML = "Should contain at least 8 characters";
} else {
    error2.style.display = "none";
    error2.innerHTML = "";
}
}

document.addEventListener("DOMContentLoaded", function () {
loginform.addEventListener("submit", function (e) {
    emailValidateChecking();
    passValidateChecking();

    if (!emailid || !passid || !error1 || !error2 || !loginform) {
    console.error("One or more elements not found");
    }

    if (error1.innerHTML || error2.innerHTML) {
    e.preventDefault();
    }
});
});

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
