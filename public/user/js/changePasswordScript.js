 
   function validateLoginForm() {
       const emailInput = document.getElementById('email');
       const emailError = document.getElementById('email-error');
       const emailValue = emailInput.value.trim();
       const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;


       if (emailValue === '') {
           emailError.textContent = 'Please enter your email.';
           emailInput.classList.add('is-invalid');
           return false;
       } else if (!emailValue.match(emailPattern)) {
           emailError.textContent = 'Please enter a valid email address';
           emailInput.classList.add('is-invalid');
           return false;
       } else {
           emailError.textContent = '';
           emailInput.classList.remove('is-invalid');
           return true;
       }
   }
 