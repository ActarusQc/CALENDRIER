[Previous content up to line 171]

async function editActivity(id) {
    try {
        const response = await fetch(`/api/activities/${id}`);
        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.error || 'Error loading activity');
            return;
        }
        const activity = await response.json();
        
        document.getElementById('activityId').value = id;
        document.getElementById('title').value = activity.title;
        document.getElementById('date').value = activity.date;
        document.getElementById('time').value = activity.time || '';
        document.getElementById('location').value = activity.location_id || '';
        document.getElementById('notes').value = activity.notes || '';
        
        await loadLocationsAndCategories();
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
        alert('Error loading activity');
    }
}

[Rest of the previous content]
