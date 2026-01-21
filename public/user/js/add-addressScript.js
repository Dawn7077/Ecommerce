
document.getElementById('addressForm').addEventListener('submit', function(event) {
    if (!validateForm()) {
        event.preventDefault();
    }
});


function validateForm() {
    let isValid = true;
    const requiredFields = ["addressType", "name", "city", "landMark", "state", "pincode", "phone", "altPhone"];
    requiredFields.forEach(function(field) {
        const input = document.getElementById(field);
        const inputValue = input.value.trim();
        const errorElement = document.getElementById(field + '-error');


        if (inputValue === "") {
            if (!errorElement) {
                const errorMessage = "This field is required.";
                const errorDiv = document.createElement('div');
                errorDiv.className = "text-danger";
                errorDiv.textContent = errorMessage;
                errorDiv.id = field + '-error';
                input.parentNode.appendChild(errorDiv);
            }
            isValid = false;
        } else {
            if (errorElement) {
                errorElement.remove();
            }
        }
    });


    const addressType = document.getElementById('addressType').value;
    const name = document.getElementById('name').value;
    const city = document.getElementById('city').value;
    const landMark = document.getElementById('landMark').value;
    const state = document.getElementById('state').value;
    const pincode = document.getElementById('pincode').value;
    const phone = document.getElementById('phone').value;
    const altPhone = document.getElementById('altPhone').value;
    const namePattern = /^[A-Za-z\s]+$/;
    const pincodePattern = /^\d{6}$/;
    const phonePattern = /^\d{10}$/;
    if (!namePattern.test(name)) {
        Swal.fire({
            title: 'Error',
            text: 'Name should contain alphabets only.',
            icon: 'error'
        });
        isValid = false;
    }
    if (!namePattern.test(city)) {
        Swal.fire({
            title: 'Error',
            text: 'City should contain alphabets only.',
            icon: 'error'
        });
        isValid = false;
    }
    if (!namePattern.test(landMark)) {
        Swal.fire({
            title: 'Error',
            text: 'Landmark should contain alphabets only.',
            icon: 'error'
        });
        isValid = false;
    }
    if (!namePattern.test(state)) {
        Swal.fire({
            title: 'Error',
            text: 'State should contain alphabets only.',
            icon: 'error'
        });
        isValid = false;
    }
    if (!pincodePattern.test(pincode)) {
        Swal.fire({
            title: 'Error',
            text: 'Pincode should be a 6-digit number.',
            icon: 'error'
        });
        isValid = false;
    }
    if (!phonePattern.test(phone)) {
        Swal.fire({
            title: 'Error',
            text: 'Phone number should be a 10-digit number.',
            icon: 'error'
        });
        isValid = false;
    }
    if (!phonePattern.test(altPhone)) {
        Swal.fire({
            title: 'Error',
            text: 'Alternate phone number should be a 10-digit number.',
            icon: 'error'
        });
        isValid = false;
    }
    if (phone === altPhone) {
        Swal.fire({
            title: 'Error',
            text: 'Phone number and alternate phone number should be different.',
            icon: 'error'
        });
        isValid = false;
    }
    return isValid;
}
