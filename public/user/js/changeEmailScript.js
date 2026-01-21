
function validateLoginForm() {
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('email-error');
    const emailValue = emailInput.value.trim();
    const emailPattern1 = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    const emailPattern2 = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})?$/
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[A-Za-z]{2,}(?:\.[a-zA-Z]{2,})?$/



    if (emailValue === '') {
        emailError.textContent = 'Please enter your email.';
        emailInput.classList.add('is-invalid');
        console.log('error');
        return false;
    } else if (!emailValue.match(emailPattern)) {
        emailError.textContent = 'Please enter a valid email address';
        emailInput.classList.add('is-invalid');
        console.log('error');
        return false;
    } else {
        emailError.textContent = '';
        emailInput.classList.remove('is-invalid');
        console.log('error');
        
        return true;
    }
}
