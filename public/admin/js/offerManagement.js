 
// Edit Product Offer
async function editProductOffer(productId, currentPercentage) {
    const { value: amount } = await Swal.fire({
        title: 'Edit Product Offer',
        input: 'number',
        inputLabel: 'Offer Percentage',
        inputPlaceholder: 'Enter percentage (1-90)',
        inputValue: currentPercentage,
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value || value < 1 || value > 90) {
                return 'Please enter a valid percentage between 1 and 90';
            }
        }
    });

    if (amount) {
        try {
            const response = await fetch('/admin/edit-product-offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, percentage: amount })
            });

            const data = await response.json();

            if (data.status) {
                await Swal.fire('Success', data.message, 'success');
                location.reload();
            } else {
                await Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            await Swal.fire('Error', 'An unexpected error occurred', 'error');
        }
    }
}

// Remove Product Offer
async function removeProductOffer(productId) {
    const result = await Swal.fire({
        title: 'Remove Product Offer?',
        text: 'This will reset the product to its regular price',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch('/admin/remove-product-offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });

            const data = await response.json();

            if (data.status) {
                await Swal.fire('Removed', data.message, 'success');
                location.reload();
            } else {
                await Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            await Swal.fire('Error', 'An unexpected error occurred', 'error');
        }
    }
}

// Edit Category Offer
async function editCategoryOffer(categoryId, currentPercentage) {
    const { value: amount } = await Swal.fire({
        title: 'Edit Category Offer',
        input: 'number',
        inputLabel: 'Offer Percentage',
        inputPlaceholder: 'Enter percentage (1-90)',
        inputValue: currentPercentage,
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value || value < 1 || value > 90) {
                return 'Please enter a valid percentage between 1 and 90';
            }
        }
    });

    if (amount) {
        try {
            const response = await fetch('/admin/edit-category-offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryId, percentage: amount })
            });

            const data = await response.json();

            if (data.status) {
                await Swal.fire('Success', data.message, 'success');
                location.reload();
            } else {
                await Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            await Swal.fire('Error', 'An unexpected error occurred', 'error');
        }
    }
}

// Remove Category Offer
async function removeCategoryOffer(categoryId) {
    const result = await Swal.fire({
        title: 'Remove Category Offer?',
        text: 'This will reset all products in this category to regular prices',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch('/admin/remove-category-offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryId })
            });

            const data = await response.json();

            if (data.status) {
                await Swal.fire('Removed', data.message, 'success');
                location.reload();
            } else {
                await Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            await Swal.fire('Error', 'An unexpected error occurred', 'error');
        }
    }
}
 