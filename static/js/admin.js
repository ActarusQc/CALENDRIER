document.addEventListener('DOMContentLoaded', function() {
    loadActivities();
});

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
    const activity = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        location: document.getElementById('location').value,
        category: document.getElementById('category').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        const response = await fetch('/api/activities', {
            method: 'POST',
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

function editActivity(id) {
    // Implementation would go here
    alert('Edit functionality to be implemented');
}

function deleteActivity(id) {
    // Implementation would go here
    alert('Delete functionality to be implemented');
}
