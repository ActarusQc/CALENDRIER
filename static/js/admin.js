document.addEventListener('DOMContentLoaded', function() {
    loadActivities();
    loadLocationsAndCategories();
    setupForm();

    // Check for selected date parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const selectedDate = urlParams.get('selected_date');
    if (selectedDate) {
        // Pre-fill the date and show the modal
        document.getElementById('date').value = selectedDate;
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        modal.show();
    }
});

async function loadLocationsAndCategories() {
    try {
        // Load locations
        const locationsResponse = await fetch('/api/locations');
        const locations = await locationsResponse.json();
        const locationSelect = document.getElementById('location');
        locationSelect.innerHTML = `<option value="">${window.translations.select_location}</option>`;
        locations.forEach(location => {
            locationSelect.innerHTML += `<option value="${location.id}">${location.name}</option>`;
        });

        // Load categories
        const categoriesResponse = await fetch('/api/categories');
        const categories = await categoriesResponse.json();
        const categoriesContainer = document.getElementById('categoriesContainer');
        categoriesContainer.innerHTML = '';
        categories.forEach(category => {
            categoriesContainer.innerHTML += `
                <div class="form-check mb-2">
                    <input type="checkbox" class="form-check-input" id="category_${category.id}" 
                           name="categories" value="${category.id}">
                    <label class="form-check-label text-white" for="category_${category.id}">
                        ${category.name}
                    </label>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading locations and categories:', error);
    }
}

function setupForm() {
    const allDayCheckbox = document.getElementById('is_all_day');
    const timeField = document.getElementById('timeField');
    const endTimeField = document.getElementById('endTimeField');
    const recurringCheckbox = document.getElementById('is_recurring');
    const recurrenceFields = document.getElementById('recurrenceFields');
    
    if (allDayCheckbox && timeField && endTimeField) {
        // Set initial state
        timeField.style.display = allDayCheckbox.checked ? 'none' : 'block';
        endTimeField.style.display = allDayCheckbox.checked ? 'none' : 'block';
        
        allDayCheckbox.addEventListener('change', function() {
            timeField.style.display = this.checked ? 'none' : 'block';
            endTimeField.style.display = this.checked ? 'none' : 'block';
            if (this.checked) {
                document.getElementById('time').value = '';
                document.getElementById('end_time').value = '';
            }
        });
    }

    if (recurringCheckbox && recurrenceFields) {
        recurringCheckbox.addEventListener('change', function() {
            recurrenceFields.style.display = this.checked ? 'block' : 'none';
            if (!this.checked) {
                document.getElementById('recurrence_type').value = '';
                document.getElementById('recurrence_end_date').value = '';
            }
        });
    }

    // Add event listener for modal show
    document.getElementById('activityModal').addEventListener('show.bs.modal', function () {
        loadLocationsAndCategories();
    });
}

async function saveActivity() {
    try {
        const activity = {
            title: document.getElementById('title').value.trim(),
            date: document.getElementById('date').value,
            is_all_day: document.getElementById('is_all_day')?.checked || false,
            time: document.getElementById('is_all_day')?.checked ? null : document.getElementById('time').value,
            end_date: document.getElementById('end_date').value || null,
            end_time: document.getElementById('is_all_day')?.checked ? null : document.getElementById('end_time').value,
            location_id: document.getElementById('location').value || null,
            category_ids: Array.from(document.querySelectorAll('input[name="categories"]:checked')).map(cb => parseInt(cb.value)),
            notes: document.getElementById('notes').value.trim(),
            is_recurring: document.getElementById('is_recurring').checked,
            recurrence_type: document.getElementById('is_recurring').checked ? document.getElementById('recurrence_type').value : null,
            recurrence_end_date: document.getElementById('is_recurring').checked ? document.getElementById('recurrence_end_date').value : null
        };

        if (!activity.title || !activity.date) {
            alert('Please fill in all required fields');
            return;
        }

        // Add validation for end date
        if (activity.end_date && activity.date > activity.end_date) {
            alert('End date cannot be before start date');
            return;
        }

        const activityId = document.getElementById('activityId').value;
        const url = activityId ? `/api/activities/${activityId}` : '/api/activities';
        const method = activityId ? 'PUT' : 'POST';

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
                const categoryColor = activity.categories.length > 0 ? activity.categories[0].color : '#6f42c1';
                tr.innerHTML = `
                    <td>${activity.date}</td>
                    <td>${activity.is_all_day ? 'All day' : (activity.time + (activity.end_time ? ' - ' + activity.end_time : ''))}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="color-dot" style="background-color: ${categoryColor}; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px;"></div>
                            ${activity.title}
                        </div>
                    </td>
                    <td>${activity.location || ''}</td>
                    <td>${activity.categories.map(c => c.name).join(', ')}</td>
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

async function editActivity(id) {
    try {
        const response = await fetch(`/api/activities/${id}`);
        if (!response.ok) {
            throw new Error('Failed to load activity');
        }
        const activity = await response.json();
        
        // Wait for locations and categories to load
        await loadLocationsAndCategories();
        
        // Set form values
        document.getElementById('activityId').value = id;
        document.getElementById('title').value = activity.title;
        document.getElementById('date').value = activity.date;
        document.getElementById('end_date').value = activity.end_date || '';
        document.getElementById('is_all_day').checked = activity.is_all_day;
        document.getElementById('time').value = activity.time || '';
        document.getElementById('end_time').value = activity.end_time || '';
        document.getElementById('timeField').style.display = activity.is_all_day ? 'none' : 'block';
        document.getElementById('endTimeField').style.display = activity.is_all_day ? 'none' : 'block';
        document.getElementById('location').value = activity.location_id || '';
        document.getElementById('notes').value = activity.notes || '';
        
        // Set recurring fields
        document.getElementById('is_recurring').checked = activity.is_recurring;
        document.getElementById('recurrence_type').value = activity.recurrence_type || '';
        document.getElementById('recurrence_end_date').value = activity.recurrence_end_date || '';
        document.getElementById('recurrenceFields').style.display = activity.is_recurring ? 'block' : 'none';
        
        // Set categories
        const checkboxes = document.querySelectorAll('input[name="categories"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = activity.category_ids.includes(parseInt(checkbox.value));
        });
        
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading activity:', error);
        alert('Error loading activity: ' + error.message);
    }
}

async function deleteActivity(id) {
    if (confirm(window.translations.delete_confirmation)) {
        try {
            const response = await fetch(`/api/activities/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await loadActivities();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete activity');
            }
        } catch (error) {
            console.error('Error deleting activity:', error);
            alert('Error deleting activity: ' + error.message);
        }
    }
}
