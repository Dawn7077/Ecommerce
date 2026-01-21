 
function updateStatus(orderId, newStatus) {
    Swal.fire({
        title: 'Are you sure?',
        text: `You are about to change the order status to ${newStatus}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, update it!'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('/admin/order-change-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderId, status: newStatus })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status) location.reload();
                else Swal.fire('Error', 'Failed to update status', 'error');
            }).catch(err => Swal.fire('Error', 'Something went wrong', 'error'));
        } else { location.reload(); }
    });
}
 