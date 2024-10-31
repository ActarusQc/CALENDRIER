// Previous code remains the same until loadLocationsAndCategories function

async function loadLocationsAndCategories() {
    try {
        const [locationsResponse, categoriesResponse] = await Promise.all([
            fetch('/api/locations'),
            fetch('/api/categories')
        ]);
        
        const locations = await locationsResponse.json();
        const categories = await categoriesResponse.json();
        
        const locationSelect = document.getElementById('location');
        const categoriesContainer = document.getElementById('categoriesContainer');
        
        // Clear existing options except the first one for locations
        locationSelect.innerHTML = `<option value="">${window.translations.select_location || 'Select location'}</option>`;
        
        // Clear categories container
        categoriesContainer.innerHTML = '';
        
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name;
            locationSelect.appendChild(option);
        });
        
        categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input category-checkbox" type="checkbox" 
                       value="${category.id}" id="category${category.id}">
                <label class="form-check-label" for="category${category.id}">
                    ${category.name}
                </label>
            `;
            categoriesContainer.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading locations and categories:', error);
        showErrorAlert('Error loading locations and categories');
    }
}

// Update activity list display to show multiple categories
function displayActivities(activities) {
    const tbody = document.getElementById('activitiesList');
    tbody.innerHTML = '';
    
    activities.sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach(activity => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${activity.date}</td>
                <td>${activity.time || ''}</td>
                <td>${activity.title}</td>
                <td>${activity.location || ''}</td>
                <td>${activity.categories.join(', ')}</td>
                <td>${activity.is_recurring ? `${getRecurrenceTypeDisplay(activity.recurrence_type)} until ${activity.recurrence_end_date}` : 'No'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editActivity(${activity.id})">${window.translations.edit}</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteActivity(${activity.id})">${window.translations.delete}</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
}

async function saveActivity() {
    const isRecurring = document.getElementById('is_recurring').checked;
    const recurrenceEndDate = document.getElementById('recurrence_end_date');
    
    if (isRecurring && !recurrenceEndDate.value) {
        showErrorAlert(window.translations.end_date);
        return;
    }
    
    // Get selected categories
    const selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    if (selectedCategories.length === 0) {
        showErrorAlert('Please select at least one category');
        return;
    }
    
    const activityId = document.getElementById('activityId').value;
    const activity = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        location_id: document.getElementById('location').value,
        category_ids: selectedCategories,
        notes: document.getElementById('notes').value,
        is_recurring: isRecurring,
        recurrence_type: document.getElementById('recurrence_type').value,
        recurrence_end_date: recurrenceEndDate.value
    };
    
    try {
        const url = activityId ? `/api/activities/${activityId}` : '/api/activities';
        const method = activityId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activity)
        });
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('activityModal'));
            modal.hide();
            loadActivities();
            showSuccessAlert('Activity saved successfully');
        } else {
            const data = await response.json();
            showErrorAlert(data.error || 'Error saving activity');
        }
    } catch (error) {
        console.error('Error saving activity:', error);
        showErrorAlert('Error saving activity');
    }
}

async function editActivity(id) {
    try {
        const response = await fetch(`/api/activities/${id}`);
        const activity = await response.json();
        
        document.getElementById('activityId').value = id;
        document.getElementById('title').value = activity.title;
        document.getElementById('date').value = activity.date;
        document.getElementById('time').value = activity.time || '';
        document.getElementById('location').value = activity.location_id || '';
        document.getElementById('notes').value = activity.notes || '';
        
        // Update category checkboxes
        const checkboxes = document.querySelectorAll('.category-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = activity.category_ids.includes(parseInt(checkbox.value));
        });
        
        const isRecurringCheckbox = document.getElementById('is_recurring');
        isRecurringCheckbox.checked = activity.is_recurring;
        isRecurringCheckbox.dispatchEvent(new Event('change'));
        
        if (activity.is_recurring) {
            document.getElementById('recurrence_type').value = activity.recurrence_type;
            document.getElementById('recurrence_end_date').value = activity.recurrence_end_date;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading activity:', error);
        showErrorAlert('Error loading activity');
    }
}

// Rest of the code remains the same
