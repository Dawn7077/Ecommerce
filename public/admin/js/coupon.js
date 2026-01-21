 
 function validateForm() {
   document.querySelectorAll(".error-message").forEach((element) => (element.innerHTML = ""));
   const sDate = document.getElementsByName("startDate")[0].value;
   const eDate = document.getElementsByName("endDate")[0].value;
   const sDateObj = new Date(sDate);
   const eDateObj = new Date(eDate);
   const todayDateObj = new Date();
   todayDateObj.setHours(0, 0, 0, 0);


   if (sDateObj > eDateObj) {
     document.getElementById("error-end-date").innerHTML ="End date should be after the start date";
     return false;
   }


   if (sDateObj <= todayDateObj) {
     document.getElementById("error-start-date").innerHTML ="Starting date should be greater than or equal to today's date";
     return false;
   }


   let name = document.getElementsByName("couponName")[0].value;
   const nameRegex = /^[A-Za-z0-9]{1,50}$/;


   if (!nameRegex.test(name)) {
     document.getElementById("error-coupon-name").innerHTML =
       "Coupon Name error";
     return false;
   }


   const offerPriceInput = document.getElementsByName("offerPrice")[0];
   const minimumPriceInput = document.getElementsByName("minimumPrice")[0];


   const offerPrice = offerPriceInput.value.trim() !== ""? parseInt(offerPriceInput.value): NaN;
   const minimumPrice = minimumPriceInput.value.trim() !== ""? parseInt(minimumPriceInput.value): NaN;


   if (isNaN(offerPrice) || isNaN(minimumPrice) || offerPrice >= minimumPrice) {
     document.getElementById("error-offer-price").innerHTML = "Offer Price must be greater than Minimum Price";
     return false;
   }


   if (isNaN(offerPrice) || isNaN(minimumPrice)) {
     document.getElementById("error-offer-price").innerHTML ="Please enter numeric values for Offer Price and Minimum Price";
     return false;
   }


       const formData = {
       couponName: name,
       startDate: sDateObj,
       endDate: eDateObj,
       offerPrice: offerPrice,
       minimumPrice: minimumPrice
   };
   return true;
 }


function confirmDelete(couponId) {
   Swal.fire({
     title: "Are you sure?",
     text: "You won't be able to revert this!",
     icon: "warning",
     showCancelButton: true,
     confirmButtonColor: "#d33",
     cancelButtonColor: "#3085d6",
     confirmButtonText: "Yes, delete it!",
   }).then((result) => {
     if (result.isConfirmed) {
       deleteCoupon(couponId);
     }
   });
 }


 async function deleteCoupon1(couponId) {
  // try {
  //   await fetch(`/admin/deleteCoupon/${coupons[i]._id}`,{
  //     method: "DELETE",
  //   })
  //   .then(res=>res.json())
  //   .then(data=>{
  //     if
  //   })
    
  // } catch (error) {
    
  // }
 






   $.ajax({
     url: `/admin/deleteCoupon/${couponId}`,
     method: "DELETE",
     success: function () {
       Swal.fire({
         icon: "success",
         title: "Deleted!",
         text: "The coupon has been deleted.",
         confirmButtonText: "OK",
       }).then(() => {
         window.location.reload();
       });
     },
     error: function () {
       Swal.fire({
         icon: "error",
         title: "Error!",
         text: "Failed to delete the coupon. Please try again.",
       });
     },
   });
 }


 async function deleteCoupon(couponId) {
  try {
    const response = await fetch(`/admin/deleteCoupon/${couponId}`,{
      method:'DELETE'
    })
    const data = await response.json()
    if(response.ok && data.success){
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "The coupon has been deleted."
      }).then(()=>{
        window.location.reload()
      })
    }else{
      Swal.fire({
        icon: "error",
        title: "Error",
        text: data.message || "Failed to delete coupon.",
      });
    }
  } catch (error) {
    console.log(error)
    Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong.",
      });
  }
 }


function setDefaultStartDate(){
  const today = new Date()
  const year = today.getFullYear()
  let month = (today.getMonth()+1).toString().padStart(2,'0')
  let day = today.getDate().toString().padStart(2,'0')
  
  document.getElementById('startingDate').value = `${year}-${month}-${day}`
  
}
 