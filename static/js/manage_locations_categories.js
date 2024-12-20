document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadLocations();

    // Add event listeners for modal show
    document.querySelector('[data-bs-target="#categoryModal"]').addEventListener('click', function() {
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryColor').value = '#6f42c1';
    });

    document.querySelector('[data-bs-target="#locationModal"]').addEventListener('click', function() {
        document.getElementById('locationId').value = '';
        document.getElementById('locationName').value = '';
    });
});

// Category Management
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        const tbody = document.getElementById('categoriesList');
        tbody.innerHTML = '';
        
        categories.forEach(category => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${category.name}</td>
                <td>
                    <div class="color-preview" style="background-color: ${category.color}; width: 20px; height: 20px; border-radius: 4px;"></div>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editCategory(${category.id})">${window.translations.edit}</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory(${category.id})">${window.translations.delete}</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function saveCategory() {
    const categoryId = document.getElementById('categoryId').value;
    const category = {
        name: document.getElementById('categoryName').value.trim(),
        color: document.getElementById('categoryColor').value
    };
    
    try {
        const url = categoryId ? `/api/categories/${categoryId}` : '/api/categories';
        const method = categoryId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(category)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
            modal.hide();
            loadCategories();
        } else {
            alert(data.error || 'Error saving category');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Error saving category');
    }
}

async function editCategory(id) {
    try {
        const response = await fetch(`/api/categories/${id}`);
        const category = await response.json();
        
        document.getElementById('categoryId').value = id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryColor').value = category.color || '#6f42c1';
        
        const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading category:', error);
        alert('Error loading category');
    }
}

async function deleteCategory(id) {
    if (confirm(window.translations.delete_confirmation)) {
        try {
            const response = await fetch(`/api/categories/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadCategories();
            } else {
                const data = await response.json();
                alert(data.error || 'Error deleting category');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('Error deleting category');
        }
    }
}

// Location Management
async function loadLocations() {
    try {
        const response = await fetch('/api/locations');
        const locations = await response.json();
        
        const tbody = document.getElementById('locationsList');
        tbody.innerHTML = '';
        
        locations.forEach(location => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${location.name}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editLocation(${location.id})">${window.translations.edit}</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteLocation(${location.id})">${window.translations.delete}</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

async function saveLocation() {
    const locationId = document.getElementById('locationId').value;
    const location = {
        name: document.getElementById('locationName').value.trim()
    };
    
    try {
        const url = locationId ? `/api/locations/${locationId}` : '/api/locations';
        const method = locationId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(location)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('locationModal'));
            modal.hide();
            loadLocations();
        } else {
            alert(data.error || 'Error saving location');
        }
    } catch (error) {
        console.error('Error saving location:', error);
        alert('Error saving location');
    }
}

async function editLocation(id) {
    try {
        const response = await fetch(`/api/locations/${id}`);
        const location = await response.json();
        
        document.getElementById('locationId').value = id;
        document.getElementById('locationName').value = location.name;
        
        const modal = new bootstrap.Modal(document.getElementById('locationModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading location:', error);
        alert('Error loading location');
    }
}

async function deleteLocation(id) {
    if (confirm(window.translations.delete_confirmation)) {
        try {
            const response = await fetch(`/api/locations/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadLocations();
            } else {
                const data = await response.json();
                alert(data.error || 'Error deleting location');
            }
        } catch (error) {
            console.error('Error deleting location:', error);
            alert('Error deleting location');
        }
    }
}