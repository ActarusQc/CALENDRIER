document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    let currentView = 'month';

    // Setup form and load initial data
    loadLocationsAndCategories();
    setupForm();

    document.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', function() {
            const view = this.dataset.view;
            currentView = view;
            
            document.querySelectorAll('[data-view]').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            updateCalendarHeader();
            updateCalendar();
        });
    });
    // ...

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

            // Refresh calendar after saving
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            await fetchActivities(year, month);
        } catch (error) {
            console.error('Error saving activity:', error);
            alert('Error saving activity: ' + error.message);
        }
    }

    function showActivityDetails(activity) {
        // Create modal HTML
        const modalHTML = `
            <div class="modal fade" id="activityDetailsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${activity.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p><strong>Date:</strong> ${activity.date}</p>
                            ${activity.time ? `<p><strong>Time:</strong> ${activity.time}${activity.end_time ? ' - ' + activity.end_time : ''}</p>` : ''}
                            ${activity.location ? `<p><strong>Location:</strong> ${activity.location}</p>` : ''}
                            ${activity.categories.length > 0 ? `<p><strong>Categories:</strong> ${activity.categories.map(c => c.name).join(', ')}</p>` : ''}
                            ${activity.notes ? `<p><strong>Notes:</strong> ${activity.notes}</p>` : ''}
                            ${activity.is_recurring ? `<p><strong>Recurring:</strong> ${activity.recurrence_type} until ${activity.recurrence_end_date}</p>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing modal
        const existingModal = document.getElementById('activityDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('activityDetailsModal'));
        modal.show();
    }

    // Initial calendar render
    updateCalendar();

    // Navigation event listeners
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });
});