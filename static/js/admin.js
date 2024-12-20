document.addEventListener('DOMContentLoaded', function() {
    // Setup checkbox handlers
    setupCheckboxHandlers();
    
    // Load activities and setup form
    loadActivities();
    loadLocationsAndCategories();
    setupForm();

    // Setup time filter handler
    document.getElementById('timeFilter').addEventListener('change', loadActivities);

    // CSV import handler
    document.getElementById('csvFileInput').addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/import-activities', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Import failed');
            
            const result = await response.json();
            if (result.success) {
                loadActivities();
                alert('Activities imported successfully');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import activities');
        }
    });

    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const selectedDate = urlParams.get('selected_date');
    const activityId = urlParams.get('activity_id');

    if (activityId) {
        // If activity_id is present, fetch and load that activity's details
        fetch(`/api/activities/${activityId}`)
            .then(response => response.json())
            .then(activity => {
                fillActivityForm(activity);
                const modal = new bootstrap.Modal(document.getElementById('activityModal'));
                modal.show();
            })
            .catch(error => {
                console.error('Error loading activity:', error);
                alert('Error loading activity: ' + error.message);
            });
    } else if (selectedDate) {
        // Pre-fill the date and show the modal
        document.getElementById('date').value = selectedDate;
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        modal.show();
    }

    // Add event listener for "Add new event" button
    document.querySelector('a[href*="/admin"].btn').addEventListener('click', function(e) {
        if (window.location.pathname === '/admin') {
            e.preventDefault();
            // Clear form fields
            document.getElementById('activityId').value = '';
            document.getElementById('title').value = '';
            document.getElementById('date').value = '';
            document.getElementById('end_date').value = '';
            document.getElementById('time').value = '';
            document.getElementById('end_time').value = '';
            document.getElementById('is_all_day').checked = false;
            document.getElementById('is_recurring').checked = false;
            document.getElementById('notes').value = '';
            document.getElementById('location').value = '';
            
            // Uncheck all category checkboxes
            document.querySelectorAll('input[name="categories"]').forEach(cb => cb.checked = false);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('activityModal'));
            modal.show();
        }
    });
});

function setupCheckboxHandlers() {
    // Handle "Select All" checkbox
    const selectAllCheckbox = document.getElementById('selectAllActivities');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.activity-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateDeleteButtonVisibility();
        });
    }

    // Handle individual checkboxes
    document.addEventListener('change', function(e) {
        if (e.target && e.target.classList.contains('activity-checkbox')) {
            updateDeleteButtonVisibility();
        }
    });

    // Handle delete selected button
    const deleteSelectedBtn = document.getElementById('deleteSelectedActivities');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelectedActivities);
    }
}

function updateDeleteButtonVisibility() {
    const checkedBoxes = document.querySelectorAll('.activity-checkbox:checked');
    const deleteButton = document.getElementById('deleteSelectedActivities');
    if (deleteButton) {
        deleteButton.style.display = checkedBoxes.length > 0 ? 'block' : 'none';
    }
}

async function deleteSelectedActivities() {
    if (!confirm(window.translations.delete_confirmation)) {
        return;
    }

    const selectedIds = Array.from(document.querySelectorAll('.activity-checkbox:checked'))
        .map(checkbox => checkbox.value);

    if (selectedIds.length === 0) return;

    try {
        const response = await fetch('/api/activities/bulk-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: selectedIds })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete activities');
        }

        await loadActivities();
    } catch (error) {
        console.error('Error deleting activities:', error);
        alert('Error deleting activities: ' + error.message);
    }
}

function fillActivityForm(activity) {
    document.getElementById('activityId').value = activity.id;
    document.getElementById('title').value = activity.title;
    document.getElementById('date').value = activity.date;
    document.getElementById('end_date').value = activity.end_date || '';
    document.getElementById('is_all_day').checked = activity.is_all_day;
    document.getElementById('time').value = activity.time || '';
    document.getElementById('end_time').value = activity.end_time || '';
    document.getElementById('location').value = activity.location_id || '';
    document.getElementById('notes').value = activity.notes || '';
    
    // Set recurring fields
    document.getElementById('is_recurring').checked = activity.is_recurring;
    document.getElementById('recurrence_type').value = activity.recurrence_type || '';
    document.getElementById('recurrence_end_date').value = activity.recurrence_end_date || '';
    
    // Update form display based on activity type
    const timeField = document.getElementById('timeField');
    const endTimeField = document.getElementById('endTimeField');
    const recurrenceFields = document.getElementById('recurrenceFields');
    
    if (timeField && endTimeField) {
        timeField.style.display = activity.is_all_day ? 'none' : 'block';
        endTimeField.style.display = activity.is_all_day ? 'none' : 'block';
    }
    
    if (recurrenceFields) {
        recurrenceFields.style.display = activity.is_recurring ? 'block' : 'none';
    }

    // Wait for categories to load before setting them
    const checkInterval = setInterval(() => {
        const checkboxes = document.querySelectorAll('input[name="categories"]');
        if (checkboxes.length > 0) {
            checkboxes.forEach(checkbox => {
                checkbox.checked = activity.category_ids && activity.category_ids.includes(parseInt(checkbox.value));
            });
            clearInterval(checkInterval);
        }
    }, 100);
}

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
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'form-check mb-2';
            categoryDiv.innerHTML = `
                <input type="checkbox" class="form-check-input" id="category_${category.id}" 
                       name="categories" value="${category.id}">
                <label class="form-check-label text-white" for="category_${category.id}">
                    <span class="color-dot" style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${category.color}; margin-right: 8px;"></span>
                    ${category.name}
                </label>
            `;
            categoriesContainer.appendChild(categoryDiv);
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

async function loadActivities() {
    try {
        const response = await fetch('/api/activities');
        const activities = await response.json();
        
        const tbody = document.getElementById('activitiesList');
        tbody.innerHTML = '';

        const timeFilter = document.getElementById('timeFilter').value;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const filteredActivities = activities.filter(activity => {
            if (timeFilter === 'current') {
                const endDate = activity.end_date ? new Date(activity.end_date) : new Date(activity.date);
                return endDate >= today;
            }
            return true;
        });
        
        filteredActivities.sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(activity => {
                const tr = document.createElement('tr');
                const categoryColor = activity.categories.length > 0 ? activity.categories[0].color : '#6f42c1';
                const dateStr = formatDate(activity.date);
                const timeStr = formatTime(activity);
                
                tr.innerHTML = `
                    <td class="align-middle">
                        <div class="form-check">
                            <input type="checkbox" class="form-check-input activity-checkbox" value="${activity.id}">
                        </div>
                    </td>
                    <td class="align-middle">${dateStr}</td>
                    <td class="align-middle">${timeStr}</td>
                    <td class="align-middle">
                        <div class="d-flex align-items-center">
                            <div class="color-dot me-2" style="background-color: ${categoryColor}; width: 12px; height: 12px; border-radius: 50%;"></div>
                            <div>
                                <div class="fw-bold">${activity.title}</div>
                                ${activity.is_recurring ? '<small class="text-muted"><i class="bi bi-arrow-repeat"></i> Recurring</small>' : ''}
                            </div>
                        </div>
                    </td>
                    <td class="align-middle">${activity.location || ''}</td>
                    <td class="align-middle">
                        <div class="d-flex flex-wrap gap-1">
                            ${activity.categories.map(c => `
                                <span class="badge" style="background-color: ${c.color}">${c.name}</span>
                            `).join('')}
                        </div>
                    </td>
                    <td class="align-middle">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editActivity(${activity.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteActivity(${activity.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

        // Update delete button visibility
        updateDeleteButtonVisibility();
    } catch (error) {
        console.error('Error loading activities:', error);
        alert('Error loading activities: ' + error.message);
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(activity) {
    if (activity.is_all_day) return 'Toute la journée';
    let timeStr = activity.time || '';
    if (activity.end_time) {
        timeStr += ` - ${activity.end_time}`;
    }
    return timeStr;
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

async function editActivity(id) {
    try {
        console.log('Editing activity:', id);
        const response = await fetch(`/api/activities/${id}`);
        if (!response.ok) {
            throw new Error('Failed to load activity');
        }
        const activity = await response.json();
        console.log('Activity data received:', activity);
        
        // Load locations and categories first
        await loadLocationsAndCategories();
        console.log('Locations and categories loaded');

        const modal = new bootstrap.Modal(document.getElementById('activityModal'));

        // Set form values once modal is shown
        document.getElementById('activityModal').addEventListener('shown.bs.modal', async function onModalShown() {
            try {
                // Remove the event listener to prevent multiple executions
                document.getElementById('activityModal').removeEventListener('shown.bs.modal', onModalShown);

                // Set basic form values
                document.getElementById('activityId').value = id;
                document.getElementById('title').value = activity.title;
                document.getElementById('date').value = activity.date;
                document.getElementById('end_date').value = activity.end_date || '';
                document.getElementById('is_all_day').checked = activity.is_all_day;
                document.getElementById('time').value = activity.time || '';
                document.getElementById('end_time').value = activity.end_time || '';
                document.getElementById('notes').value = activity.notes || '';

                // Set location with retry
                const locationSelect = document.getElementById('location');
                if (locationSelect && activity.location_id) {
                    console.log('Setting location:', activity.location_id);
                    locationSelect.value = activity.location_id;
                }

                // Set time fields visibility
                document.getElementById('timeField').style.display = activity.is_all_day ? 'none' : 'block';
                document.getElementById('endTimeField').style.display = activity.is_all_day ? 'none' : 'block';

                // Set recurring fields
                document.getElementById('is_recurring').checked = activity.is_recurring;
                document.getElementById('recurrence_type').value = activity.recurrence_type || '';
                document.getElementById('recurrence_end_date').value = activity.recurrence_end_date || '';
                document.getElementById('recurrenceFields').style.display = activity.is_recurring ? 'block' : 'none';

                // Set categories with retry
                const categoryCheckboxes = document.querySelectorAll('input[name="categories"]');
                if (activity.category_ids && activity.category_ids.length > 0) {
                    console.log('Setting categories:', activity.category_ids);
                    categoryCheckboxes.forEach(checkbox => {
                        checkbox.checked = activity.category_ids.includes(parseInt(checkbox.value));
                    });
                }
            } catch (error) {
                console.error('Error setting form values:', error);
            }
        });

        // Show the modal
        modal.show();
    } catch (error) {
        console.error('Error loading activity:', error);
        alert('Error loading activity: ' + error.message);
    }
}

async function deleteActivity(id) {
    if (!confirm(window.translations.delete_confirmation)) {
        return;
    }

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
