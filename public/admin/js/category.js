
  let currentPage = <%= currentPage %>;
  let currentSearch = '<%= search %>';

  async function loadCategories(page = 1, search = '') {
    try {
      const url = new URL('/admin/category', window.location.origin);
      url.searchParams.set('page', page);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) throw new Error('Failed to load categories');

      const result = await res.json();

      currentPage = result.currentPage;
      currentSearch = search;

      renderTable(result.categories);
      renderPagination(result.totalPages, result.currentPage);
      updateURL(page, search);

    } catch (error) {
      console.error('Error loading categories:', error);
      Swal.fire('Error', 'Failed to load categories', 'error');
    }
  }

  function renderTable(categories) {
    const tbody = document.getElementById('categoryTableBody');

    if (categories.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center">No categories found</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = categories.map(category => `
      <tr data-category-id="${category._id}">
        <td></td>
        <td class="text-start category-name">${escapeHtml(category.name)}</td>
        <td class="text-start category-description">${escapeHtml(category.description)}</td>
        <td class="category-offer">${category.categoryOffer || 0}%</td>
        <td class="text-start">
          <button 
            class="btn btn-info offer-btn" 
            style="width: 100px"
            data-id="${category._id}"
            data-has-offer="${category.categoryOffer > 0}"
          >
            <span class="text-white">
              ${category.categoryOffer === 0 ? 'Add Offer' : 'Remove'}
            </span>
          </button>
        </td>
        <td class="text-start category-status">
          <span class="badge rounded-pill ${category.isListed ? 'btn-success' : 'btn-danger'}" 
                style="width: 60px; padding:9px;">
            ${category.isListed ? 'Listed' : 'Unlisted'}
          </span>
        </td>
        <td class="text-start">
          <button 
            class="btn ${category.isListed ? 'btn-danger' : 'btn-success'} list-btn" 
            style="width: 70px"
            data-id="${category._id}"
            data-listed="${category.isListed}"
          >
            <span class="text-white">
              ${category.isListed ? 'Unlist' : 'List'}
            </span>
          </button>
        </td>
        <td class="text-start">
          <a href="/admin/editCategory?id=${category._id}" class="btn btn-info text-white">Edit</a>
        </td>
      </tr>
    `).join('');
  }

  function renderPagination(totalPages, activePage) {
    const pagination = document.getElementById('pagination');

    if (totalPages === 0) {
      pagination.innerHTML = '';
      return;
    }

    pagination.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
      .map(page => `
        <li class="page-item ${page === activePage ? 'active' : ''}">
          <a href="#" class="page-link page-link-btn" data-page="${page}">
            ${page}
          </a>
        </li>
      `).join('');
  }

  function updateURL(page, search) {
    const url = new URL(window.location);
    url.searchParams.set('page', page);

    if (search) {
      url.searchParams.set('search', search);
    } else {
      url.searchParams.delete('search');
    }

    window.history.pushState({}, '', url);
  }

  document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const name = document.getElementsByName('name')[0].value.trim();
    const description = document.getElementById('descriptionId').value.trim();

    try {
      const res = await fetch('/admin/addCategory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add category');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Category added successfully'
      });

      e.target.reset();
      clearErrorMessage();

      loadCategories(currentPage, currentSearch);

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Oops',
        text: error.message || 'An error occurred while adding the category'
      });
    }
  });

  // Form validation
  function validateForm() {
    clearErrorMessage();
    const name = document.getElementsByName("name")[0].value.trim();
    const description = document.getElementById("descriptionId").value.trim();
    let isValid = true;

    if (name === "") {
      displayErrorMessage("name-error", "Please enter a name");
      isValid = false;
    } else if (name.length > 50) {
      displayErrorMessage("name-error", "Category Name must be 50 characters or less");
      isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(name)) {
      displayErrorMessage('name-error', 'Category Name should only contain alphabetic characters');
      isValid = false;
    }

    if (description === "") {
      displayErrorMessage("description-error", "Please enter a description");
      isValid = false;
    }

    return isValid;
  }

  function displayErrorMessage(elementId, message) {
    let errorElement = document.getElementById(elementId);
    errorElement.innerText = message;
    errorElement.style.display = 'block';
  }

  function clearErrorMessage() {
    const errorElements = document.getElementsByClassName('error-message');
    Array.from(errorElements).forEach(element => {
      element.innerText = '';
      element.style.display = 'none';
    });
  }

  document.getElementById('categoryTableBody').addEventListener('click', async (e) => {
    const offerBtn = e.target.closest('.offer-btn');
    if (offerBtn) {
      const categoryId = offerBtn.dataset.id;
      const hasOffer = offerBtn.dataset.hasOffer === 'true';

      if (hasOffer) {
        await removeOffer(categoryId);
      } else {
        await addOffer(categoryId);
      }
    }
  }); 

  async function addOffer(categoryId) {
    const { value: amount } = await Swal.fire({
      title: 'Offer in percentage',
      input: 'number',
      inputLabel: 'Percentage',
      inputPlaceholder: 'Enter offer percentage',
      showCancelButton: true,
      inputAttributes: {
        min: 1,
        max: 90
      },
      inputValidator: (value) => {
        if (!value) {
          return 'Offer percentage is required';
        }
        if (value < 1 || value > 90) {
          return 'Please enter a valid percentage between 1 and 90';
        }
      }
    });

    if (amount) {
      try {
        const response = await fetch('/admin/addCategoryOffer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ percentage: amount, categoryId })
        });

        const data = await response.json();

        if (response.ok && data.status === true) {
          await Swal.fire({
            title: 'Offer added',
            text: 'Offer has been added',
            icon: 'success'
          });

          updateCategoryOfferInDOM(categoryId, amount);
        } else {
          Swal.fire('Failed', data.message || 'Adding offer failed', 'error');
        }
      } catch (error) {
        Swal.fire('Error', 'An error occurred', 'error');
        console.log("Error adding offer", error);
      }
    }
  }

  async function removeOffer(categoryId) {
    try {
      const response = await fetch('/admin/removeCategoryOffer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId })
      });

      const data = await response.json();

      if (response.ok && data.status === true) {
        await Swal.fire(
          'Offer removed',
          'Offer has been removed',
          'success'
        );

        updateCategoryOfferInDOM(categoryId, 0);
      } else {
        Swal.fire('Failed', data.message || 'Removing offer failed', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'An error occurred removing the offer', 'error');
      console.log("Error removing offer", error);
    }
  }

  function updateCategoryOfferInDOM(categoryId, percentage) {
    const row = document.querySelector(`tr[data-category-id="${categoryId}"]`);
    if (!row) return;

    const offerCell = row.querySelector('.category-offer');
    const offerBtn = row.querySelector('.offer-btn');

    offerCell.textContent = `${percentage}%`;
    offerBtn.dataset.hasOffer = percentage > 0;
    offerBtn.querySelector('span').textContent = percentage === 0 ? 'Add Offer' : 'Remove';
  }

  document.getElementById('categoryTableBody').addEventListener('click', async (e) => {
    const listBtn = e.target.closest('.list-btn');
    if (listBtn) {
      await toggleListStatus(listBtn);
    }
  });

  async function toggleListStatus(button) {
    const id = button.dataset.id;
    const isListed = button.dataset.listed === 'true';
    const action = isListed ? 'list' : 'unlist';

    button.disabled = true;
    const originalHTML = button.innerHTML;
    button.innerHTML = '<span class="text-white">Processing...</span>';

    try {
      const url = isListed ? `/admin/listCategory?id=${id}` : `/admin/unlistCategory?id=${id}`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      const result = await res.json();

      if (result.success) { 
        button.dataset.listed = !isListed;
        button.className = `btn ${isListed ? 'btn-success' : 'btn-danger'} list-btn`;
        button.innerHTML = `<span class="text-white">${isListed ? 'List' : 'Unlist'}</span>`;

        const row = document.querySelector(`tr[data-category-id="${id}"]`);
        const statusCell = row.querySelector('.category-status');
        statusCell.innerHTML = `
          <span class="badge rounded-pill ${isListed ? 'btn-danger' : 'btn-success'}" 
                style="width: 60px; padding:9px;">
            ${isListed ? 'Unlisted' : 'Listed'}
          </span>
        `;
      } else {
        throw new Error(result.message || 'Action failed');
      }
    } catch (error) {
      console.error(`Error ${action}ing category:`, error);
      button.innerHTML = originalHTML;
      Swal.fire('Error', `Failed to ${action} category`, 'error');
    } finally {
      button.disabled = false;
    }
  }

  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const search = document.getElementById('searchInput').value.trim();
    currentSearch = search;
    loadCategories(1, search);

    document.getElementById('clearSearch').style.display = search ? 'flex' : 'none';
  });

  document.getElementById('clearSearch').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    currentSearch = '';
    loadCategories(1, '');
    document.getElementById('clearSearch').style.display = 'none';
  });

  document.getElementById('pagination').addEventListener('click', (e) => {
    e.preventDefault();
    if (e.target.classList.contains('page-link-btn')) {
      const page = parseInt(e.target.dataset.page);
      loadCategories(page, currentSearch);
    }
  });

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
