
function confirmRemove(productId) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = `/deleteItem?id=${productId}`;
        }
    })
}

    function addToCart(productId){
fetch('add-to-cart',{
    method:'POST',
    headers:{
    'content-type':'application/json'
    },
    body:JSON.stringify({productId})
}).then((res)=>res.json())
.then(data=>{
    if(data.status){
        window.location.reload()
    }else{
    Swal.fire({
        title:"Error",
        text:'There was an error adding the product to your cart',
        icon:"error",
        timer:2000
    })
    }
}) 
.catch(error=>{
    Swal.fire({
        title:"Error",
        text:'There was an error adding the product to your cart',
        icon:"error",
        timer:2000
    })
})
}



    function updateCart(productId,change){
        fetch('product-update-cart',{
        method:'PUT',
        headers:{
            'content-type':'application/json'
        },
        body:JSON.stringify({productId,change})
    })
    .then(res=>res.json())
    .then(data=>{
        if(!data.status){
            Swal.fire("Error", data.message, "error");
            return;
        }
        document.getElementById(`cartProductQuantity${productId}`).value = data.quantity
        document.getElementById(`subTotal${productId}`).innerText = data.itemSubtotal
        document.getElementById('total').innerText = data.grandTotal
    })
    .catch(err=>{
        console.error(err);
        Swal.fire("Error", "Something went wrong", "error");
    })
    }

    function deleteItemCart(productId){
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!'
    }).then((result) => {
        if (!result.isConfirmed)  return

        fetch(`product-delete-cart/${productId}`,{
        method:'DELETE', 
        })
        .then(res=>res.json())
        .then(data=>{
            if(!data.status){
                Swal.fire("Error", data.message, "error");
                return;
            } 
                Swal.fire("Removed!", 'Item removed from cart', "success");
                document.getElementById(`cart-row-${productId}`).remove();
                document.getElementById("total").innerText = data.grandTotal;
            
        })
        .catch(err=>{
            console.error(err);
            Swal.fire("Error", "Something went wrong", "error");
        })
    }) 
    
    }

        function deleteCart(){
    Swal.fire({
        title: 'Are you sure?',
        text: "Delete Cart!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, clear it!'
    }).then((result) => {
            if (!result.isConfirmed)   return

            fetch(`/delete-cart`,{
            method:'DELETE', 
        })
        .then(res=>res.json())
        .then(data=>{
            if(!data.status){
                Swal.fire("Error", data.message, "error");
                return;
            }else{
                Swal.fire("Removed!", 'Cart Cleared', "success")
                .then(()=> window.location.href = '/cart')
            }
        })

    })
}


