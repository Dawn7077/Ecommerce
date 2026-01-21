
    function updateStatus(orderId) {
        const status = document.getElementById("statusSelect").value;

        Swal.fire({
            title: "Are you sure?",
            text: "Update order status to " + status + "?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, update",
        }).then((result) => {
            if (result.isConfirmed) {
                fetch("/admin/order-change-status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId, status })
                })
                .then(res => res.json())
                .then(data => {
                    if(data.status){
                        Swal.fire("Updated!", "Order status updated.", "success")
                        .then(() => location.reload());
                    } else {
                        Swal.fire("Error", "Failed to update status.", "error");
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire('Error', 'Something went wrong', 'error');
                });
            }
        });
    } 

    function approveReturn(orderId,itemId){
    Swal.fire({
        title:'Approve Return?',
        icon:'warning',
        showCancelButton:true,
        confirmButtonText:'Yes,approve'
    })
    .then(result=>{
        if(result.isConfirmed){
            fetch('/admin/approve-return',{
                method:'POST',
                headers:{'Content-Type': 'application/json'},
                body:JSON.stringify({orderId,itemId})
            })
            .then(res=> res.json())
            .then(data=>{
                if(data.success){
                    Swal.fire("Approved!", data.message, "success")
                    .then(()=>location.reload())
                }else{
                    Swal.fire("Error", data.message, "error");
                }
            })
        }
    })
    }
    function rejectReturn(orderId,itemId){
    Swal.fire({
        title:'Reject Return?',
        icon:'warning',
        showCancelButton:true,
        confirmButtonText:'Yes, reject'
    })
    .then(result=>{
        if(result.isConfirmed){
            fetch('/admin/reject-return',{
                method:"POST", 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ orderId, itemId })
            })
            .then(res=> res.json())
            .then(data=>{
                if(data.success){
                    Swal.fire("Rejected!", data.message, "success")
                    .then(() => location.reload());
                }else{
                    Swal.fire("Error", data.message, "error"); 
                }
            })
        }
    })
    }
