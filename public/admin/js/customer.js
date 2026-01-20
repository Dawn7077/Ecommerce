let currentPage = window.params?.currentPage || 1;
let currentSearch = window.params?.currentSearch || '';

async function loadCustomers(page = 1, search = '') {
    try {
        const url = new URL('/admin/users', window.location.origin);
        url.searchParams.set('page', page);
        if (search) url.searchParams.set('search', search);

        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) throw new Error('Failed to load customers');

        const result = await res.json();

        currentPage = result.currentPage;
        currentSearch = search;

        renderTable(result.data);
        renderPagination(result.totalPages, result.currentPage);
        updateURL(page, search);

    } catch (error) {
        console.error('Error loading customers:', error);
        alert('Failed to load customers. Please try again.');
    }
}

function renderTable(users) {
    const tbody = document.getElementById('customerTableBody');

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">No customers found</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr data-user-id="${user._id}">
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${escapeHtml(user.phone)}</td>
            <td>
                <button
                    class="btn ${user.isBlocked ? 'btn-success' : 'btn-danger'} block-btn"
                    style="width: 80px;"
                    data-id="${user._id}"
                    data-blocked="${user.isBlocked}"
                >
                    ${user.isBlocked ? 'Unblock' : 'Block'}
                </button>
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
                <a 
                    href="#" 
                    class="page-link page-link-btn" 
                    data-page="${page}"
                >
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

async function toggleBlockStatus(button) {
    const id = button.dataset.id;
    const isBlocked = button.dataset.blocked === 'true';
    const action = isBlocked ? 'unblock' : 'block';

    if (!confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Processing...';

    try {
        const url = `/admin/${action}Customer?id=${id}`;
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });

        const result = await res.json();

        if (result.success) {
            button.dataset.blocked = !isBlocked;
            button.textContent = isBlocked ? 'Block' : 'Unblock';
            button.className = `btn ${isBlocked ? 'btn-danger' : 'btn-success'} block-btn`;

            showNotification(`Customer ${action}ed successfully`, 'success');
        } else {
            throw new Error(result.message || 'Action failed');
        }
    } catch (error) {
        console.error(`Error ${action}ing customer:`, error);

        button.textContent = originalText;

        showNotification(`Failed to ${action} customer. Please try again.`, 'error');
    } finally {
        button.disabled = false;
    }
}

document.getElementById('customerTableBody').addEventListener('click', (e) => {
    if (e.target.classList.contains('block-btn')) {
        toggleBlockStatus(e.target);
    }
});

document.getElementById('pagination').addEventListener('click', (e) => {
    e.preventDefault();
    if (e.target.classList.contains('page-link-btn')) {
        const page = parseInt(e.target.dataset.page);
        loadCustomers(page, currentSearch);
    }
});

document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const search = document.getElementById('searchInput').value.trim();
    currentSearch = search;
    loadCustomers(1, search);

    document.getElementById('clearSearch').style.display = search ? 'flex' : 'none';
});

document.getElementById('clearSearch').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    currentSearch = '';
    loadCustomers(1, '');
    document.getElementById('clearSearch').style.display = 'none';
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    if (type === 'error') {
        alert(message);
    }
}
