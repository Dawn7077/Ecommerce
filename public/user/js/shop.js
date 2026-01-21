
function addToWishlist(productId){
fetch('add-to-wishlist',{
    method:'POST',
    headers:{
    'content-type':'application/json'
    },
    body:JSON.stringify({productId})
}).then((res)=>res.json())
.then(data=>{
    if(data.status){
    Swal.fire({
        title:"Added to Wishlist",
        // text:data.message,
        text:'Prodcut has been added to wiahlist',
        icon:"success",
        timer:2000
    })
    const btn = document.getElementById(`wishlist-btn-${productId}`)
    btn.innerHTML = `<i class= "fas fa-heart" style="color: red;"></i>`
    }else{
    Swal.fire({
        title:"Already in Wishlist",
        text:data.message,
        icon:"warning",
        timer:2000
    })
    }
})
.catch(error=>{
    Swal.fire({
        title:"Error",
        text:'There was an error adding the product to your wishlist',
        icon:"error",
        timer:2000
    })
})
}

let selectedProductId =null

function addToCart(productId){ 
selectedProductId = productId;
fetch(`/product-variants/${productId}`)
.then(res=>res.json())
.then(data=>{
    window.allVariants = data.variants

    const colors = [... new Set(data.variants.map(v=>v.color))]
    // const sizes = [... new Set(data.variants.map(v=>v.size))]

    document.getElementById('variantColor').innerHTML=
    colors.map(c=>`<option value="${c}">${c}</option>`).join('')

    updateSizeDropDown()
    document.getElementById('variantColor').onchange = updateSizeDropDown

    // ----> removed becuase all the availabe size options are shown not related to color variant showing not a variant error
    // document.getElementById('variantSize').innerHTML=
    // sizes.map(s=>`<option value="${s}">${s}</option>`).join('')  

    document.getElementById('variantModal').style.display = 'flex'
})
}

function updateSizeDropDown(){
const colorSelected = document.getElementById('variantColor').value

const validSizes = allVariants
    .filter(v=> v.color === colorSelected)
    .map(v => v.size)

document.getElementById('variantSize').innerHTML = 
    validSizes.map(s => `<option value="${s}">${s}</option>`).join('');

}

function closeVariantModal(){
document.getElementById('variantModal').style.display = 'none'
}

function confirmAddToCart(){

const color = document.getElementById('variantColor').value
const size = document.getElementById('variantSize').value


fetch('/add-to-cart',{
    method:'POST',
    headers:{
    'content-type':'application/json'
    },
    body:JSON.stringify({
    productId:selectedProductId,
    color,
    size
    })
})
.then((res)=>res.json())
.then(data=>{

    closeVariantModal()

    if(data.status){
    Swal.fire({
        title:"Added to Cart",
        // text:data.message,
        text:'Prodcut has been added to cart',
        icon:"success",
        timer:2000
    })
    }else{
    Swal.fire({
        title:"Error",
        text:data.message,
        icon:"warning",
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
    console.log(error)
})
}


function redirectLogin(){
    Swal.fire({
        title:'Login Required',
        text:"Please login to continue",
        icon:'warning',
        showCancelButton:true,
        confirmButtonColor:'#3085d6',
        cancelButtonColor:'#d33',
        confirmButtonText:'Login Now'
    })
    .then(result=>{
        if(result.isConfirmed){
            window.location.href = '/login'
        }
    })
}
