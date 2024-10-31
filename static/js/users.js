document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
});

async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        
        const tbody = document.querySelector('table tbody');
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})">${window.translations.edit}</button>
                    ${user.username !== 'admin' ? 
                        `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">${window.translations.delete}</button>` 
                        : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showError(window.translations.error_loading_users || 'Error loading users');
    }
}

async function saveUser(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const userId = formData.get('userId');
    
    // Convert FormData to JSON object
    const data = {};
    formData.forEach((value, key) => {
        // Only include password if it's not empty
        if (key !== 'password' || value) {
            data[key] = value;
        }
    });
    
    try {
        const url = userId ? `/api/users/${userId}` : '/api/users';
        const method = userId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
            modal.hide();
            await loadUsers();
            hideError();
        } else {
            const errorData = await response.json();
            showError(errorData.error || 'Error saving user');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showError(window.translations.error_saving_user || 'Error saving user');
    }
}

async function editUser(id) {
    try {
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) {
            showError(window.translations.error_loading_user || 'Error loading user');
            return;
        }
        const user = await response.json();
        
        document.getElementById('userId').value = id;
        document.getElementById('username').value = user.username;
        document.getElementById('email').value = user.email;
        document.getElementById('role').value = user.role;
        document.getElementById('password').value = '';
        
        hideError();
        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading user:', error);
        showError(window.translations.error_loading_user || 'Error loading user');
    }
}

async function deleteUser(id) {
    if (confirm(window.translations.delete_confirmation)) {
        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await loadUsers();
            } else {
                const errorData = await response.json();
                showError(errorData.error || window.translations.error_deleting_user || 'Error deleting user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            showError(window.translations.error_deleting_user || 'Error deleting user');
        }
    }
}

function resetUserForm() {
    const form = document.getElementById('userForm');
    form.reset();
    document.getElementById('userId').value = '';
    hideError();
}

function showError(message) {
    const errorAlert = document.getElementById('errorAlert');
    errorAlert.textContent = message;
    errorAlert.classList.remove('d-none');
}

function hideError() {
    const errorAlert = document.getElementById('errorAlert');
    errorAlert.classList.add('d-none');
}

// Add form submit handler
document.getElementById('userForm').addEventListener('submit', saveUser);
