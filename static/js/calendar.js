// Full calendar.js content with updates
[Previous content from static/js/calendar.js lines 1-385]

    // Add quickSaveActivity function
    function quickSaveActivity() {
        const activity = {
            title: document.getElementById('quickActivityTitle').value,
            date: document.getElementById('quickActivityDate').value,
            end_date: document.getElementById('quickActivityEndDate').value || null,
            is_all_day: document.getElementById('quickActivityAllDay').checked,
            time: document.getElementById('quickActivityAllDay').checked ? null : document.getElementById('quickActivityTime').value,
            end_time: document.getElementById('quickActivityAllDay').checked ? null : document.getElementById('quickActivityEndTime').value,
            location_id: document.getElementById('quickActivityLocation').value || null,
            category_ids: Array.from(document.querySelectorAll('#quickActivityCategories input:checked')).map(cb => parseInt(cb.value))
        };

        if (!activity.title || !activity.date) {
            alert('Veuillez remplir tous les champs obligatoires');
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
                    throw new Error(data.error || 'Erreur lors de l'enregistrement de l'activité');
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
                throw new Error(data.error || 'Erreur lors de l'enregistrement de l'activité');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message);
        });
    }

    // Make sure the function is globally available
    window.quickSaveActivity = quickSaveActivity;

    // Initial calendar update
    updateCalendar();
});
