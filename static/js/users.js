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
    }
}

async function saveUser(event) {
    event.preventDefault();
    const form = document.getElementById('userForm');
    const formData = new FormData(form);
    const userId = formData.get('userId');
    
    try {
        const url = userId ? `/api/users/${userId}` : '/api/users';
        const method = userId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(Object.fromEntries(formData))
        });
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
            modal.hide();
            loadUsers();
        } else {
            const data = await response.json();
            alert(data.error || 'Error saving user');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Error saving user');
    }
}

async function editUser(id) {
    try {
        const response = await fetch(`/api/users/${id}`);
        const user = await response.json();
        
        document.getElementById('userId').value = id;
        document.getElementById('username').value = user.username;
        document.getElementById('email').value = user.email;
        document.getElementById('role').value = user.role;
        document.getElementById('password').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading user:', error);
        alert('Error loading user');
    }
}

async function deleteUser(id) {
    if (confirm(window.translations.delete_confirmation)) {
        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadUsers();
            } else {
                alert('Error deleting user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        }
    }
}

// Add form submit handler
document.getElementById('userForm').addEventListener('submit', saveUser);
