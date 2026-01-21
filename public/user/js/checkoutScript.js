

    // document.getElementById("editAddressModal").addEventListener("submit", function (e) {
    //     e.preventDefault();
    //     if (validateEditAddressForm()) {
    //         this.submit();
    //     }
    // });

    function validateEditAddressForm() {
        const fields = [
            { id: "editAddressType", name: "Address Type" },
            { id: "editName", name: "Name" },
            { id: "editCity", name: "City" },
            { id: "editLandMark", name: "Landmark" },
            { id: "editState", name: "State" },
            { id: "editPincode", name: "Pincode" },
            { id: "editPhone", name: "Phone" },
        ];

        let isValid = true;

        document.querySelectorAll(".error-message").forEach(el => el.innerHTML = "");

        fields.forEach(field => {
            const input = document.getElementById(field.id);
            const value = input.value.trim();
            const errorDiv = getErrorDiv(input);

            input.classList.remove("is-invalid");

            if (value === "") {
                errorDiv.innerHTML = `${field.name} is required`;
                input.classList.add("is-invalid");
                isValid = false;
            }
        });

        // Edit pincode
        const pincode = document.getElementById("editPincode");
        if (pincode.value && !/^[1-9][0-9]{5}$/.test(pincode.value)) {
            getErrorDiv(pincode).innerHTML = "Enter a valid 6-digit pincode";
            pincode.classList.add("is-invalid");
            isValid = false;
        }

        // Edit phone
        const phone = document.getElementById("editPhone");
        if (phone.value && !/^[6-9]\d{9}$/.test(phone.value)) {
            getErrorDiv(phone).innerHTML = "Enter a valid 10-digit phone number";
            phone.classList.add("is-invalid");
            isValid = false;
        }

        return isValid;
    }
  
let selectedAddress = null;
let selectedPayment = 'cod';

document.addEventListener('DOMContentLoaded', function() {
    const firstAddress = document.querySelector('.address-card.selected');
    if (firstAddress) {
        selectedAddress = firstAddress.getAttribute('data-address-id');
    }
    const defaultPayment = document.querySelector('.payment-method.selected')
    if(defaultPayment){
        selectedPayment = defaultPayment.getAttribute('data-payment')
    }

    const dropdown = document.getElementById('myDropdown');
    if (dropdown) {
        dropdown.addEventListener('change', function() {
            selectedPayment = this.value;
            console.log('Payment method changed to:', selectedPayment);
        });
    }
});



function selectPayment(method) {
    // if(method==='cod'){
        selectedPayment =method
    // }else{
    //     selectedPayment =document.getElementById('myDropdown').value
    // } 
    console.log(selectedPayment)
    document.querySelectorAll(".payment-method").forEach(e => e.classList.remove("selected"));
    document.querySelector(`[data-payment="${method}"]`).classList.add("selected");
}

 

function selectAddress(id) {
    selectedAddress = id;
    document.querySelectorAll(".address-card").forEach(c => c.classList.remove("selected"));
    document.querySelector(`[data-address-id="${id}"]`)?.classList.add("selected");
}
 
// open form add addrees
function openModal() {
  document.getElementById("addressModal").style.display = "block";
}

function closeModal() {
  document.getElementById("addressModal").style.display = "none";
}
// open form edit addrees
function openEditModal(addressId){
    document.getElementById('editAddressModal').style.display = 'block'
}
function closeEditModal(addressId){
    document.getElementById('editAddressModal').style.display = 'none'
}

//validating add and edit addrees modal

function editAddress(addressId){
    const addressCard = document.querySelector(`[data-address-id="${addressId}"]`)
    const addressData = JSON.parse(addressCard.getAttribute('data-address'))

    document.getElementById('editAddressId').value = addressData._id
    document.getElementById('editAddressType').value = addressData.addressType
    document.getElementById('editName').value = addressData.name
    document.getElementById('editCity').value = addressData.city
    document.getElementById('editLandMark').value = addressData.landMark
    document.getElementById('editState').value = addressData.state
    document.getElementById('editPincode').value = addressData.pincode
    document.getElementById('editPhone').value = addressData.phone
    document.getElementById('editAltPhone').value = addressData.altPhone || ''

    openEditModal()
}

function deleteAddress(addressId){
    swal({
        title:'Are you sure?',
        text:"Do you want to delete this address?",
        icon:'warning',
        buttons:true,
        dangerMode:true,
    })
    .then(async (willDelete)=>{
        if(willDelete){
            try{
                const response = await fetch(`/delete-address/${addressId}`,{
                    method:"DELETE",
                    headers:{
                        'content-type':'application/json'
                    },
                })

                const data = await response.json()

                if(data.success){
                    swal('Address deleted!','Your address has been removed','success')
                    .then(()=> location.reload())
                }else{
                    swal('Error',data.message||'Could not delete address','error')
                } 
                
            }
            catch(error){
                console.log('Delete error:',error)
                swal('Error','Something went wrong ','error')
            }
        }
    })

}


// Close form when clicking outside content
window.onclick = function(event) {
  const modal = document.getElementById("addressModal");
  const editModal = document.getElementById("editAddressModal");
  if (event.target === modal) {
    closeModal(); 
  }
  if (event.target === editModal) { 
    closeEditModal()
  }
}

 
document.getElementById("modalAddressForm").addEventListener("submit", async function(e){
  e.preventDefault();
    if (!validateAddressForm()) {
        return;  
    }
 

   
    const addressType =  document.getElementById("addressType").value
    const name= document.getElementById("name").value
    const city= document.getElementById("city").value
    const landMark= document.getElementById("landMark").value
    const state= document.getElementById("state").value
    const pincode= document.getElementById("pincode").value
    const phone= document.getElementById("phone").value
    const altPhone= document.getElementById("altPhone").value
    
    try {
        await fetch("/add-new-address", {
      method: "POST",
      headers:{
        'content-type':'application/json'
      },
      body: JSON.stringify({
        addressType,
        name,
        city,
        landMark,
        state,
        pincode,
        phone,
        altPhone,
      })
    })
    .then(res=>res.json())
    .then(data=>{
        if(data.success){
            closeModal()
            swal("Address added!", "Your new address is saved.", "success") 
            .then(()=>location.reload()); // refresh checkout to show new address
        }else{
            swal("Error", data.message || "Could not save address", "error");
        }
    })
    .catch(err=>{
        console.log('=>>>',err)
        swal("Error", "Something went wrong", "error");
    })


    } 
    catch (error) {
        console.log('11111=>>>',error)
        swal("Error", "Something went wrong", "error");
    }

   
});

document.getElementById('modalEditAddressForm').addEventListener('submit',async function(e){
    e.preventDefault()
    if (!validateEditAddressForm()) {
        return;  
    }

    const addressId = document.getElementById('editAddressId').value
    const addressType = document.getElementById('editAddressType').value
    const name = document.getElementById('editName').value
    const city = document.getElementById('editCity').value
    const landMark = document.getElementById('editLandMark').value
    const state = document.getElementById('editState').value
    const pincode = document.getElementById('editPincode').value
    const phone = document.getElementById('editPhone').value
    const altPhone = document.getElementById('editAltPhone').value

    try {
        const response = await fetch(`/edit-address/${addressId}`,{
            method:'PUT',
            headers:{
                "content-type":'application/json'
            },
            body:JSON.stringify({
                addressId,addressType,
                name,city,landMark,state,
                pincode,phone,altPhone
            })
        })
        const data = await response.json()
        if(data.success){
            closeEditModal()
            swal("Address updated!",'Your address has been updated','success')
            .then(()=>location.reload())
        }else{
            swal('Error',data.message||'Could not update address','error')
        }


    } catch (error) {
        console.log('Edit error:',error)
        swal('Error','Something went wrong ','error')
    }
})


async function applyCouponCode(code,event) {
    if(event) event.stopPropagation()
    const couponCode = code || document.getElementById('couponInput').value.trim()
    
    if(!couponCode){
        return swal('Error',"Please enter a coupon code", 'warning')
    }
    try {
        const response = await fetch('/apply-coupon',{
            method:'POST',
            headers:{
                'Content-Type':'application/json'
            },
            body:JSON.stringify({ couponCode})
        })
        const data = await response.json()

        if(data.success){
            swal('Success',data.message, 'success')
            .then(() =>{
                    location.reload()
                // redirect to checkout page
            // window.location.href = '/checkout';
                }) 
        }else{
            swal('Error',data.message, 'error')
        }
    } catch (error) {
        console.log('Error applying coupon:', error);
        swal('Error', 'Something went wrong', 'error');
    }
}

async function removeCoupon() {
    try {
        const response = await fetch('/remove-coupon',{
            method:'POST',
            headers:{
                'Content-Type':'application/json'
            }
        })

        const data = await response.json()
        if(data.success){
            swal('Removed',data.message,'success')
            .then(()=>location.reload())
        }else{
            swal('Error',data.message, 'error')
        }

    } catch (error) { 
        console.log('Error removing coupon:', error);
        swal('Error', 'Something went wrong', 'error');
    }
}
document.getElementById('couponInput')?.addEventListener('keydown',function(e){
    if(e.key === 'Enter'){
        applyCouponCode()
    }
})

function allowOnlyNumbers(e) {
    e.target.value = e.target.value.replace(/\D/g, '');
}


  
  
  async function placeOrder2() {
        if(!selectedAddress){
            swal("Error", "Please select a shipping address", "error");
                return;
        }
        if(!selectedPayment){
            swal("Error", "Please select a payment method", "error");
            return;
        }

        const btn = document.getElementById('placeOrderBtn')
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        btn.disabled = true

        try {
            const response = await fetch('/checkout-placeorder',{
                method:'POST',
                headers:{
                    'Content-Type': 'application/json',
                },
                body:JSON.stringify({
                    addressId:selectedAddress,
                    paymentMethod:selectedPayment
                })
            })
            //created a order

            const data = await response.json()
            if(data.success){
                if(selectedPayment==='cod'){
                    swal('Order Placed',`Your order has been placed succefully. Order ID: ${data.orderId}`,'success')
                    .then(()=>location.href= data.redirect) 
                } else  if(selectedPayment==='Stripe') {
                    const stripeResponse = await fetch('/payment/stripe/create-session',{
                        method:"POST", 
                        headers: { "Content-Type": "application/json" },
                        body:JSON.stringify({orderId:data.orderId})
                    }) 
                    const stripeData = await stripeResponse.json()

                    if(stripeData){
                        window.location.href = stripeData.url
                    }else{
                        swal("Payment Error", stripeData.message, "error");
                    }

                }else if (selectedPayment === 'Wallet') { 
                    if (data.success) {
                        swal(
                            'Payment Successful',
                            `Your order has been placed using wallet. Order ID: ${data.orderId}`,
                            'success'
                        ).then(() => location.href = '/order')
                    }
                    else {
                        swal('Insufficient Balance', data.message, 'error')
                        .then(() => location.href = data.redirect || '/wallet');
                    }
                }


            }else{
                console.log("❌ Order creation failed:", data.message);
                    swal("Error", data.message, "error");
            }


        } catch (error) {
            console.error('❌ Error placing order:', error);
            swal("Error", "Failed to place order. Please try again.", "error");
        }
    }
 
 
 
 async function placeOrder() {
    if (!selectedAddress) {
        swal("Error", "Please select a shipping address", "error");
        return;
    }
    if (!selectedPayment) {
        swal("Error", "Please select a payment method", "error");
        return;
    }

    const btn = document.getElementById('placeOrderBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    try {
        const response = await fetch('/checkout-placeorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                addressId: selectedAddress,
                paymentMethod: selectedPayment
            })
        });

        const data = await response.json();

        if (!data.success) {
            // Handling errors
            if (selectedPayment === 'Wallet' && data.redirect) {
                swal("Insufficient Balance", data.message, "error")
                    .then(() => location.href = data.redirect);
            } else {
                swal("Error", data.message, "error");
            }
            btn.disabled = false;
            btn.innerHTML = "Place Order";
            return;
        }
 
        if (selectedPayment === 'cod') {


            swal(
                'Order Placed',
                `Your order has been placed successfully. Order ID: ${data.orderId}`,
                'success'
            ).then(() => location.href = data.redirect);
            return;
        }

        if (selectedPayment === 'Wallet') {
            swal(
                'Payment Successful',
                `Your order has been placed using wallet. Order ID: ${data.orderId}`,
                'success'
            ).then(() => location.href = data.redirect);
            return;
        }

        if (selectedPayment === 'Stripe') { 
            if(data.proceedToStripe){
                const stripeRes = await fetch('/payment/stripe/create-session', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    // body: JSON.stringify({ orderId: data.orderId })
                });

                const stripeData = await stripeRes.json();
                
                if (stripeData.success && stripeData.url) {
                    // Redirect to Stripe checkout
                    window.location.href = stripeData.url;
                } else {
                    swal("Payment Error", stripeData.message || "Failed to create payment session", "error");
                    btn.disabled = false;
                    btn.innerHTML = "Place Order";
                }
                
            }
            
            return;
        }

    } catch (error) {
        console.error("Error placing order:", error);
        swal("Error", "Something went wrong!", "error");
        btn.disabled = false;
        btn.innerHTML = "Place Order";
    }
} 



$(document).ready(function() {
    // Destroy nice-select if it was applied to our dropdown
    if ($('#myDropdown').next('.nice-select').length) {
        $('#myDropdown').unwrap();
        $('#myDropdown').next('.nice-select').remove();
    }
    
    // Make sure original select is visible
    $('#myDropdown').show().css({
        'display': 'inline-block',
        'visibility': 'visible',
        'opacity': '1'
    });
});
 