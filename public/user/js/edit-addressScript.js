
   document.getElementById('submitButton').addEventListener('click', function (event) {
       if (!validateForm()) {
           event.preventDefault();
       }
   });


   function validateForm() {
       let isValid = true;
       const requiredFields = ["addressType", "name", "city", "landMark", "state", "pincode", "phone", "altPhone"];
       requiredFields.forEach(function (field) {
           const input = document.getElementById(field);
           if (input.value.trim() === "") {
               Swal.fire({
                   title: 'Error',
                   text: `Please fill all the field.`,
                   icon: 'error'
               });
               isValid = false;
           }
       });


       return isValid;
   }
 