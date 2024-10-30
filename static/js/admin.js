document.addEventListener('DOMContentLoaded', function() {
    loadActivities();
    loadShareLink();
    setupShareCardVisibility();
    
    // Setup recurring activity checkbox handler
    document.getElementById('is_recurring').addEventListener('change', function(e) {
        const recurrenceOptions = document.getElementById('recurrenceOptions');
        recurrenceOptions.style.display = e.target.checked ? 'block' : 'none';
    });
});

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
    
    // Add transition event listeners
    shareCardContainer.addEventListener('show.bs.collapse', function () {
        toggleShareCard.classList.add('active');
    });
    
    shareCardContainer.addEventListener('hide.bs.collapse', function () {
        toggleShareCard.classList.remove('active');
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
    }
}

function copyShareLink() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');
    alert('Share link copied to clipboard!');
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
                    <td>${activity.is_recurring ? `${activity.recurrence_type} until ${activity.recurrence_end_date}` : 'No'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editActivity(${activity.id})">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteActivity(${activity.id})">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

async function saveActivity() {
    const activityId = document.getElementById('activityId').value;
    const activity = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        location: document.getElementById('location').value,
        category: document.getElementById('category').value,
        notes: document.getElementById('notes').value,
        is_recurring: document.getElementById('is_recurring').checked,
        recurrence_type: document.getElementById('recurrence_type').value,
        recurrence_end_date: document.getElementById('recurrence_end_date').value
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
        } else {
            alert('Error saving activity');
        }
    } catch (error) {
        console.error('Error saving activity:', error);
        alert('Error saving activity');
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
        document.getElementById('location').value = activity.location || '';
        document.getElementById('category').value = activity.category;
        document.getElementById('notes').value = activity.notes || '';
        
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading activity:', error);
        alert('Error loading activity');
    }
}

async function deleteActivity(id) {
    if (confirm('Are you sure you want to delete this activity?')) {
        try {
            const response = await fetch(`/api/activities/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadActivities();
            } else {
                alert('Error deleting activity');
            }
        } catch (error) {
            console.error('Error deleting activity:', error);
            alert('Error deleting activity');
        }
    }
}
