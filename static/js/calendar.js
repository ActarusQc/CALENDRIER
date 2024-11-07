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

    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            renderCalendar(activities);
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }

    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        updateCalendarHeader();
        fetchActivities(year, month);
    }

    function updateCalendarHeader() {
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        document.getElementById('currentMonth').textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    function renderCalendar(activities) {
        const datesContainer = document.getElementById('calendarDates');
        datesContainer.innerHTML = '';
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        
        // Previous month's days
        for (let i = 0; i < startingDay; i++) {
            const dateDiv = document.createElement('div');
            dateDiv.className = 'calendar-date other-month';
            datesContainer.appendChild(dateDiv);
        }
        
        // Current month's days
        for (let date = 1; date <= lastDay.getDate(); date++) {
            const dateDiv = document.createElement('div');
            dateDiv.className = 'calendar-date';
            
            // Add date number with link
            const dateNumber = document.createElement('a');
            dateNumber.className = 'date-number';
            dateNumber.textContent = date;
            dateNumber.href = '#';
            dateNumber.onclick = (e) => {
                e.preventDefault();
                document.getElementById('date').value = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                const modal = new bootstrap.Modal(document.getElementById('activityModal'));
                modal.show();
            };
            dateDiv.appendChild(dateNumber);
            
            // Container for all-day activities
            const allDayContainer = document.createElement('div');
            allDayContainer.className = 'all-day-activities';
            dateDiv.appendChild(allDayContainer);
            
            // Container for timed activities
            const timedContainer = document.createElement('div');
            timedContainer.className = 'timed-activities';
            dateDiv.appendChild(timedContainer);
            
            // Add activities for this date
            const currentDate = new Date(year, month, date);
            const dateString = currentDate.toISOString().split('T')[0];
            
            activities.forEach(activity => {
                if (activity.date === dateString || 
                    (activity.end_date && activity.date <= dateString && activity.end_date >= dateString)) {
                    const activityElement = createActivityElement(activity);
                    if (activity.is_all_day) {
                        allDayContainer.appendChild(activityElement);
                    } else {
                        timedContainer.appendChild(activityElement);
                    }
                }
            });
            
            datesContainer.appendChild(dateDiv);
        }
    }

    function createActivityElement(activity) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity';
        activityDiv.style.backgroundColor = activity.categories.length > 0 ? activity.categories[0].color : '#6f42c1';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'activity-content';
        
        if (activity.time && !activity.is_all_day) {
            const timeSpan = document.createElement('span');
            timeSpan.className = 'time';
            timeSpan.textContent = `${activity.time}${activity.end_time ? ' - ' + activity.end_time : ''}`;
            contentDiv.appendChild(timeSpan);
        }
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        titleDiv.textContent = activity.title;
        contentDiv.appendChild(titleDiv);
        
        if (activity.location) {
            const locationDiv = document.createElement('div');
            locationDiv.className = 'location';
            locationDiv.textContent = activity.location;
            contentDiv.appendChild(locationDiv);
        }
        
        activityDiv.appendChild(contentDiv);
        activityDiv.addEventListener('click', () => showActivityDetails(activity));
        
        return activityDiv;
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
                            <h5 class="modal-title text-white">${activity.title}</h5>
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
