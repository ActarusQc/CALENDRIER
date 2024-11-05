// ... existing code ...

function quickSaveActivity() {
    const activity = {
        title: document.getElementById('quickActivityTitle').value,
        date: document.getElementById('quickActivityDate').value,
        end_date: document.getElementById('quickActivityEndDate').value || null,
        is_all_day: document.getElementById('quickActivityAllDay').checked,
        time: document.getElementById('quickActivityAllDay').checked ? null : document.getElementById('quickActivityTime').value,
        end_time: document.getElementById('quickActivityAllDay').checked ? null : document.getElementById('quickActivityEndTime').value,
        location_id: document.getElementById('quickActivityLocation').value || null,
        category_ids: Array.from(document.querySelectorAll('#quickActivityCategories input:checked')).map(cb => parseInt(cb.value)),
        notes: document.getElementById('quickActivityNotes').value,
        is_recurring: document.getElementById('quickActivityRecurring').checked,
        recurrence_type: document.getElementById('quickActivityRecurring').checked ? document.getElementById('quickActivityRecurrenceType').value : null,
        recurrence_end_date: document.getElementById('quickActivityRecurring').checked ? document.getElementById('quickActivityRecurrenceEndDate').value : null
    };

    if (!activity.title || !activity.date) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }

    // Validate recurring activity fields
    if (activity.is_recurring && (!activity.recurrence_type || !activity.recurrence_end_date)) {
        alert('Pour une activité récurrente, veuillez sélectionner le type de récurrence et la date de fin');
        return;
    }

    // Validate end date
    if (activity.end_date && activity.date > activity.end_date) {
        alert('La date de fin ne peut pas être antérieure à la date de début');
        return;
    }

    fetch('/api/activities', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(activity)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Erreur lors de l\'enregistrement de l\'activité');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const modal = bootstrap.Modal.getInstance(document.querySelector('.modal'));
            modal.hide();
            updateCalendar();
        } else {
            throw new Error(data.error || 'Erreur lors de l\'enregistrement de l\'activité');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message);
    });
}

// Make the function globally available
window.quickSaveActivity = quickSaveActivity;
