document.addEventListener('DOMContentLoaded', function() {
    loadActivities();
    setupAllDayToggle();
    loadLocationsAndCategories();
});

function setupAllDayToggle() {
    const allDayCheckbox = document.getElementById('is_all_day');
    const timeField = document.getElementById('timeField');
    
    if (allDayCheckbox && timeField) {
        // Set initial state
        timeField.style.display = allDayCheckbox.checked ? 'none' : 'block';
        
        allDayCheckbox.addEventListener('change', function() {
            timeField.style.display = this.checked ? 'none' : 'block';
            if (this.checked) {
                document.getElementById('time').value = '';
            }
        });
    }
}

async function loadLocationsAndCategories() {
    try {
        const [locationsResponse, categoriesResponse] = await Promise.all([
            fetch('/api/locations'),
            fetch('/api/categories')
        ]);
        
        if (!locationsResponse.ok || !categoriesResponse.ok) {
            throw new Error('Failed to load data');
        }
        
        const locations = await locationsResponse.json();
        const categories = await categoriesResponse.json();
        
        // Populate location dropdown
        const locationSelect = document.getElementById('location');
        locationSelect.innerHTML = `<option value="">${window.translations.select_location || 'Select location'}</option>`;
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name;
            locationSelect.appendChild(option);
        });
        
        // Populate categories checkboxes
        const categoriesContainer = document.getElementById('categoriesContainer');
        categoriesContainer.innerHTML = '';
        categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input category-checkbox" type="checkbox" 
                    value="${category.id}" id="category${category.id}">
                <label class="form-check-label text-white" for="category${category.id}">
                    ${category.name}
                </label>
            `;
            categoriesContainer.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading locations and categories:', error);
        alert('Error loading data');
    }
}

async function editActivity(id) {
    try {
        const response = await fetch(`/api/activities/${id}`);
        if (!response.ok) {
            throw new Error('Failed to load activity');
        }
        const activity = await response.json();
        
        // Load locations and categories first
        await loadLocationsAndCategories();
        
        // Set form values
        document.getElementById('activityId').value = id;
        document.getElementById('title').value = activity.title;
        document.getElementById('date').value = activity.date;
        
        // Set all-day checkbox and time field
        const allDayCheckbox = document.getElementById('is_all_day');
        const timeField = document.getElementById('timeField');
        allDayCheckbox.checked = activity.is_all_day;
        document.getElementById('time').value = activity.time || '';
        timeField.style.display = activity.is_all_day ? 'none' : 'block';
        
        // Set color
        document.getElementById('color').value = activity.color || '#6f42c1';
        document.getElementById('location').value = activity.location_id || '';
        document.getElementById('notes').value = activity.notes || '';
        
        // Set categories
        const checkboxes = document.querySelectorAll('.category-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = activity.category_ids.includes(parseInt(checkbox.value));
        });
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading activity:', error);
        alert('Error loading activity: ' + error.message);
    }
}

async function saveActivity() {
    try {
        // Get form values
        const activity = {
            title: document.getElementById('title').value,
            date: document.getElementById('date').value,
            is_all_day: document.getElementById('is_all_day').checked,
            time: document.getElementById('is_all_day').checked ? null : document.getElementById('time').value,
            color: document.getElementById('color').value,
            location_id: document.getElementById('location').value || null,
            category_ids: Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => parseInt(cb.value)),
            notes: document.getElementById('notes').value
        };

        // Validate required fields
        if (!activity.title || !activity.date) {
            alert('Please fill in all required fields');
            return;
        }

        const activityId = document.getElementById('activityId').value;
        const url = activityId ? `/api/activities/${activityId}` : '/api/activities';
        const method = activityId ? 'PUT' : 'POST';

        console.log('Saving activity:', activity);
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activity)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save activity');
        }

        // Close modal and reload activities
        const modal = bootstrap.Modal.getInstance(document.getElementById('activityModal'));
        modal.hide();
        await loadActivities();
    } catch (error) {
        console.error('Error saving activity:', error);
        alert('Error saving activity: ' + error.message);
    }
}

async function loadActivities() {
    try {
        const response = await fetch('/api/activities');
        const activities = await response.json();
        
        const tbody = document.getElementById('activitiesList');
        tbody.innerHTML = '';
        
        activities.sort((a, b) => new Date(a.date) - new Date(b.date))
            .forEach(activity => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${activity.date}</td>
                    <td>${activity.is_all_day ? 'All day' : (activity.time || '')}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="color-dot" style="background-color: ${activity.color}; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px;"></div>
                            ${activity.title}
                        </div>
                    </td>
                    <td>${activity.location || ''}</td>
                    <td>${activity.categories.join(', ')}</td>
                    <td>${activity.is_recurring ? `${activity.recurrence_type} until ${activity.recurrence_end_date}` : 'No'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editActivity(${activity.id})">${window.translations.edit}</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteActivity(${activity.id})">${window.translations.delete}</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
    } catch (error) {
        console.error('Error loading activities:', error);
        alert('Error loading activities: ' + error.message);
    }
}

async function deleteActivity(id) {
    if (confirm(window.translations.delete_confirmation)) {
        try {
            const response = await fetch(`/api/activities/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete activity');
            }
            
            await loadActivities();
        } catch (error) {
            console.error('Error deleting activity:', error);
            alert('Error deleting activity: ' + error.message);
        }
    }
}
