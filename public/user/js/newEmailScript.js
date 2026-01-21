 

    function nameValidateCheck(){
        const nameVal = document.getElementById('name').value
        const emailError = document.getElementById('name-error');  
        const namePattern = /^[A-Za-z\s]+$/
        
        if(nameVal.trim()==="") {
          emailError.style.display="block"
          emailError.innerHTML= "please enter a valid name"
          return false;
        }else if(!namePattern.test(nameVal)){
          emailError.style.display = "block"
          emailError.innerHTML= "Name can only contain letters and space"
          return false;
        }else{
          emailError.style.display = "none"
          return true;
        }
         
      }

   function validateEmailForm() {
       const emailInput = document.getElementById('email');
       const emailError = document.getElementById('email-error');
       const emailValue = emailInput.value.trim();
       const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;


       if (emailValue === '') {
           emailError.textContent = 'Please enter your new email.';
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

   function phoneValidateCheck(){
        const phoneVal = document.getElementById('phone').value
        const emailError = document.getElementById('phone-error');
        const phonePattern = /^[0-9]+$/;


        if(phoneVal.trim()===''){
          emailError.style.display = 'block'
          emailError.innerHTML ='Enter valid phone number'
          return false;
        }else if(!phonePattern.test(phoneVal)){
          emailError.style.display = 'block'
          emailError.innerHTML = 'Phone number can only contain digits'
          return false;
        }else if(phoneVal.length !== 10) {
            phoneError.style.display = 'block';
            phoneError.innerHTML = 'Enter 10 digit phone number';
            return false;
        }else{
          emailError.style.display = 'none'
          emailError.innerHTML= ''
          return true;
        }
      }

   async function submitData(event){
    event.preventDefault()

    const isNameValid = nameValidateCheck()
    const isEmailValid =validateEmailForm()
    const isPhoneValid =phoneValidateCheck()

    if( !isEmailValid || !isNameValid || !isPhoneValid){  
        Swal.fire('Error',  'Please Choose right Info ', 'error');
        return
    }


        try {
            const newName =  document.getElementById('name').value.trim()
            const newEmail =  document.getElementById('email').value.trim()
            const newPhone =  document.getElementById('phone').value.trim()

            const res = await fetch('/update-profile',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                    newName,
                    newEmail,
                    newPhone,
                })
            })
            const data = await res.json()
            if(data.success){
                Swal.fire('Success', data.message, 'success')
                .then(()=>window.location.href=data.redirectUrl )
            }else{
                Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            console.log(error)
            Swal.fire('Error', 'Something error happened', 'error');
        }
   }



 