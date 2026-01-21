 
    // Cancel Modal Functions
    function openCancelModal(type, orderId, itemId = null) {
        document.getElementById('cancelType').value = type;
        document.getElementById('cancelOrderId').value = orderId;
        document.getElementById('cancelItemId').value = itemId || '';
        document.getElementById('cancelModal').classList.add('active');
    }

    function closeCancelModal() {
        document.getElementById('cancelModal').classList.remove('active');
        document.getElementById('cancelForm').reset();
    }

    // Return Modal Functions
    function openReturnModal(orderId, itemId) {
        document.getElementById('returnOrderId').value = orderId;
        document.getElementById('returnItemId').value = itemId;
        document.getElementById('returnModal').classList.add('active');
    }

    function closeReturnModal() {
        document.getElementById('returnModal').classList.remove('active');
        document.getElementById('returnForm').reset();
    }

    // Cancel Form =>Submit
    document.getElementById('cancelForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const type = document.getElementById('cancelType').value;
        const orderId = document.getElementById('cancelOrderId').value;
        const itemId = document.getElementById('cancelItemId').value;
        const reason = document.getElementById('cancelReason').value;
        const comments = document.getElementById('cancelComments').value;

        const fullReason = comments ? `${reason} - ${comments}` : reason;

        closeCancelModal()

        try {
            const response = await fetch(`/cancel-order/${orderId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    itemId: itemId || null,
                    reason: fullReason
                })
            });

            const data = await response.json();

            if (data.success) {
                closeCancelModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Cancelled Successfully',
                    text: data.message,
                    confirmButtonColor: '#3399cc'
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Cancellation Failed',
                    text: data.message,
                    confirmButtonColor: '#3399cc'
                });
            }
        } catch (error) {
            console.error('Cancel error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Something went wrong. Please try again.',
                confirmButtonColor: '#3399cc'
            });
        }
    });

    // Return Form =>Submit
    document.getElementById('returnForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const orderId = document.getElementById('returnOrderId').value;
        const itemId = document.getElementById('returnItemId').value;
        const reason = document.getElementById('returnReason').value;
        const comments = document.getElementById('returnComments').value;

        const fullReason = `${reason} - ${comments}`;
        closeReturnModal()

        try {
            const response = await fetch(`/return-order/${orderId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    itemId,
                    reason: fullReason
                })
            });

            const data = await response.json();

            if (data.success) {
                closeReturnModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Return Request Submitted',
                    text: data.message,
                    confirmButtonColor: '#3399cc'
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Request Failed',
                    text: data.message,
                    confirmButtonColor: '#3399cc'
                });
            }
        } catch (error) {
            console.error('Return error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Something went wrong. Please try again.',
                confirmButtonColor: '#3399cc'
            });
        }
    });

    // Close modals when clicking outside
    document.getElementById('cancelModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeCancelModal();
        }
    });

    document.getElementById('returnModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeReturnModal();
        }
    });
 