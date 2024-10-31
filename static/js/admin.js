document.addEventListener('DOMContentLoaded', function() {
    loadActivities();
    loadShareLink();
    setupShareCardVisibility();
    loadLocationsAndCategories();
    
    // Setup recurring activity checkbox handler
    document.getElementById('is_recurring').addEventListener('change', function(e) {
        const recurrenceOptions = document.getElementById('recurrenceOptions');
        const recurrenceEndDate = document.getElementById('recurrence_end_date');
        
        recurrenceOptions.style.display = e.target.checked ? 'block' : 'none';
        if (e.target.checked) {
            recurrenceEndDate.setAttribute('required', 'required');
        } else {
            recurrenceEndDate.removeAttribute('required');
        }
    });
});

async function loadLocationsAndCategories() {
    try {
        const [locationsResponse, categoriesResponse] = await Promise.all([
            fetch('/api/locations'),
            fetch('/api/categories')
        ]);
        
        const locations = await locationsResponse.json();
        const categories = await categoriesResponse.json();
        
        const locationSelect = document.getElementById('location');
        const categorySelect = document.getElementById('category');
        
        // Clear existing options except the first one
        locationSelect.innerHTML = `<option value="">${window.translations.select_location || 'Select location'}</option>`;
        categorySelect.innerHTML = `<option value="">${window.translations.select_category || 'Select category'}</option>`;
        
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name;
            locationSelect.appendChild(option);
        });
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading locations and categories:', error);
        showErrorAlert('Error loading locations and categories');
    }
}

function setupShareCardVisibility() {
    const shareCardContainer = document.getElementById('shareCardContainer');
    const toggleShareCard = document.getElementById('toggleShareCard');
    const closeShareCard = document.getElementById('closeShareCard');
    
    // Initialize Bootstrap collapse
    const bsCollapse = new bootstrap.Collapse(shareCardContainer, {
        toggle: false
    });
    
    // Load initial state from localStorage
    const isVisible = localStorage.getItem('shareCardVisible') === 'true';
    if (isVisible) {
        bsCollapse.show();
    }
    
    // Toggle button click handler
    toggleShareCard.addEventListener('click', function() {
        const isCurrentlyVisible = shareCardContainer.classList.contains('show');
        if (isCurrentlyVisible) {
            bsCollapse.hide();
            localStorage.setItem('shareCardVisible', 'false');
        } else {
            bsCollapse.show();
            localStorage.setItem('shareCardVisible', 'true');
        }
    });
    
    // Close button click handler
    closeShareCard.addEventListener('click', function() {
        bsCollapse.hide();
        localStorage.setItem('shareCardVisible', 'false');
    });
}

async function loadShareLink() {
    try {
        const response = await fetch('/api/share-link');
        const data = await response.json();
        if (data.share_link) {
            document.getElementById('shareLink').value = window.location.origin + '/calendar/' + data.share_link;
        }
    } catch (error) {
        console.error('Error loading share link:', error);
        showErrorAlert('Error loading share link');
    }
}

async function generateNewShareLink() {
    try {
        const response = await fetch('/api/share-link/generate', {
            method: 'POST'
        });
        const data = await response.json();
        if (data.share_link) {
            document.getElementById('shareLink').value = window.location.origin + '/calendar/' + data.share_link;
        }
    } catch (error) {
        console.error('Error generating share link:', error);
        showErrorAlert('Error generating share link');
    }
}

function copyShareLink() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');
    showSuccessAlert('Share link copied to clipboard!');
}

function getRecurrenceTypeDisplay(type) {
    const recurrenceTypes = {
        'daily': window.translations.daily,
        'weekly': window.translations.weekly,
        'monthly': window.translations.monthly,
        'annually': window.translations.annually
    };
    return recurrenceTypes[type] || type;
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
                    <td>${activity.time || ''}</td>
                    <td>${activity.title}</td>
                    <td>${activity.location || ''}</td>
                    <td>${activity.category}</td>
                    <td>${activity.is_recurring ? `${getRecurrenceTypeDisplay(activity.recurrence_type)} until ${activity.recurrence_end_date}` : 'No'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editActivity(${activity.id})">${window.translations.edit}</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteActivity(${activity.id})">${window.translations.delete}</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
    } catch (error) {
        console.error('Error loading activities:', error);
        showErrorAlert('Error loading activities');
    }
}

async function saveActivity() {
    const isRecurring = document.getElementById('is_recurring').checked;
    const recurrenceEndDate = document.getElementById('recurrence_end_date');
    
    if (isRecurring && !recurrenceEndDate.value) {
        showErrorAlert(window.translations.end_date);
        return;
    }
    
    const activityId = document.getElementById('activityId').value;
    const activity = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        location_id: document.getElementById('location').value,
        category_id: document.getElementById('category').value,
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
        document.getElementById('category').value = activity.category_id;
        document.getElementById('notes').value = activity.notes || '';
        
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

async function deleteActivity(id) {
    if (confirm(window.translations.delete_confirmation)) {
        try {
            const response = await fetch(`/api/activities/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadActivities();
                showSuccessAlert('Activity deleted successfully');
            } else {
                const data = await response.json();
                showErrorAlert(data.error || 'Error deleting activity');
            }
        } catch (error) {
            console.error('Error deleting activity:', error);
            showErrorAlert('Error deleting activity');
        }
    }
}

function showErrorAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertAdjacentElement('afterbegin', alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

function showSuccessAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertAdjacentElement('afterbegin', alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}
