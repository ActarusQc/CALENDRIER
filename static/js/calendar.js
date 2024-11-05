document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    let currentView = 'month'; // Default view

    document.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('[data-view]').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            currentView = button.getAttribute('data-view');
            updateCalendar();
        });
    });

    document.querySelector('[data-view="month"]').classList.add('active');

    function updateCalendarHeader(view) {
        const daysContainer = document.querySelector('.calendar-days');
        daysContainer.innerHTML = '';
        
        switch(view) {
            case 'business-week':
                // Show only Monday-Friday
                ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].forEach(day => {
                    const div = document.createElement('div');
                    div.textContent = day;
                    daysContainer.appendChild(div);
                });
                break;
            case 'day':
                // Show only current day name
                const dayName = currentDate.toLocaleString('fr-FR', { weekday: 'long' });
                const div = document.createElement('div');
                div.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                daysContainer.appendChild(div);
                break;
            default:
                // Full week for month and week views
                ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].forEach(day => {
                    const div = document.createElement('div');
                    div.textContent = day;
                    daysContainer.appendChild(div);
                });
        }

        const monthYear = new Date(currentDate).toLocaleString('fr-FR', { 
            month: 'long', 
            year: 'numeric' 
        }).replace(/^./, str => str.toUpperCase());
        
        document.getElementById('currentMonth').textContent = monthYear;
    }

    function updateCalendar() {
        const calendarGrid = document.querySelector('.calendar-grid');
        calendarGrid.className = 'calendar-grid ' + currentView;
        
        updateCalendarHeader(currentView);
        
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.innerHTML = '';

        switch(currentView) {
            case 'month':
                renderMonthView();
                break;
            case 'week':
                renderWeekView();
                break;
            case 'business-week':
                renderBusinessWeekView();
                break;
            case 'day':
                renderDayView();
                break;
        }
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        fetchActivities(year, month);
    }

    function renderMonthView() {
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.style.gridTemplateColumns = 'repeat(7, 1fr)';
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Fill in days from previous month
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarDates.appendChild(createDateCell());
        }
        
        // Fill in days of current month
        for (let date = 1; date <= lastDay.getDate(); date++) {
            const cellDate = new Date(year, month, date);
            calendarDates.appendChild(createDateCell(cellDate));
        }
    }

    function renderWeekView() {
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.innerHTML = '';
        calendarDates.style.gridTemplateColumns = 'repeat(7, 1fr)';
        
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateCell = createDateCell(date);
            calendarDates.appendChild(dateCell);
        }
    }

    function renderBusinessWeekView() {
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.innerHTML = '';
        calendarDates.style.gridTemplateColumns = 'repeat(5, 1fr)';
        
        const startOfWeek = new Date(currentDate);
        const diff = startOfWeek.getDay() === 0 ? -6 : 1 - startOfWeek.getDay(); // Adjust to get to Monday
        startOfWeek.setDate(startOfWeek.getDate() + diff);
        
        for (let i = 0; i < 5; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateCell = createDateCell(date);
            calendarDates.appendChild(dateCell);
        }
    }

    function renderDayView() {
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.innerHTML = '';
        calendarDates.style.gridTemplateColumns = '1fr';
        
        const dateCell = createDateCell(currentDate);
        calendarDates.appendChild(dateCell);
    }

    function createDateCell(date) {
        const cell = document.createElement('div');
        cell.className = 'calendar-date';
        
        if (date) {
            const dateDiv = document.createElement('a');
            dateDiv.href = '#';
            dateDiv.className = 'date-number';
            dateDiv.textContent = date.getDate();
            dateDiv.addEventListener('click', (e) => {
                e.preventDefault();
                const formattedDate = date.toISOString().split('T')[0];
                showAddActivityModal(formattedDate);
            });
            cell.appendChild(dateDiv);
            
            const allDayDiv = document.createElement('div');
            allDayDiv.className = 'all-day-activities';
            const formattedDate = date.toISOString().split('T')[0];
            allDayDiv.setAttribute('data-date', formattedDate);
            cell.appendChild(allDayDiv);
            
            const activitiesDiv = document.createElement('div');
            activitiesDiv.className = 'timed-activities';
            activitiesDiv.setAttribute('data-date', formattedDate);
            cell.appendChild(activitiesDiv);
        }
        
        return cell;
    }

    function showAddActivityModal(date) {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);">
                    <div class="modal-header border-bottom border-light border-opacity-25">
                        <h5 class="modal-title text-white fw-bold">Ajouter une activité</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="quickAddActivityForm">
                            <div class="mb-3">
                                <label class="form-label text-white">Titre</label>
                                <input type="text" class="form-control bg-dark text-white" id="quickActivityTitle" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label text-white">Date</label>
                                <input type="date" class="form-control bg-dark text-white" id="quickActivityDate" value="${date}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label text-white">Date de fin</label>
                                <input type="date" class="form-control bg-dark text-white" id="quickActivityEndDate">
                            </div>
                            <div class="mb-3">
                                <div class="form-check mb-2">
                                    <input type="checkbox" class="form-check-input" id="quickActivityAllDay">
                                    <label class="form-check-label text-white">Toute la journée</label>
                                </div>
                                <div id="quickTimeFields">
                                    <div class="mb-3">
                                        <label class="form-label text-white">Heure</label>
                                        <input type="time" class="form-control bg-dark text-white" id="quickActivityTime">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label text-white">Heure de fin</label>
                                        <input type="time" class="form-control bg-dark text-white" id="quickActivityEndTime">
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check mb-2">
                                    <input type="checkbox" class="form-check-input" id="quickActivityRecurring">
                                    <label class="form-check-label text-white">Activité récurrente</label>
                                </div>
                                <div id="quickRecurrenceFields" style="display: none;">
                                    <div class="mb-3">
                                        <label class="form-label text-white">Type de récurrence</label>
                                        <select class="form-control bg-dark text-white" id="quickActivityRecurrenceType">
                                            <option value="daily">Quotidien</option>
                                            <option value="weekly">Hebdomadaire</option>
                                            <option value="monthly">Mensuel</option>
                                            <option value="annually">Annuel</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label text-white">Date de fin de récurrence</label>
                                        <input type="date" class="form-control bg-dark text-white" id="quickActivityRecurrenceEndDate">
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label text-white">Lieu</label>
                                <select class="form-control bg-dark text-white" id="quickActivityLocation">
                                    <option value="">Sélectionnez un lieu</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label text-white">Catégories</label>
                                <div id="quickActivityCategories" class="border rounded p-3">
                                    <!-- Categories will be loaded here -->
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label text-white">Notes</label>
                                <textarea class="form-control bg-dark text-white" id="quickActivityNotes"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                        <button type="button" class="btn btn-primary" onclick="quickSaveActivity()">Enregistrer</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        // Load locations and categories
        fetch('/api/locations')
            .then(response => response.json())
            .then(locations => {
                const locationSelect = document.getElementById('quickActivityLocation');
                locations.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location.id;
                    option.textContent = location.name;
                    locationSelect.appendChild(option);
                });
            });

        fetch('/api/categories')
            .then(response => response.json())
            .then(categories => {
                const categoriesContainer = document.getElementById('quickActivityCategories');
                categories.forEach(category => {
                    const div = document.createElement('div');
                    div.className = 'form-check';
                    div.innerHTML = `
                        <input class="form-check-input" type="checkbox" 
                            value="${category.id}" id="quickCategory${category.id}">
                        <label class="form-check-label text-white" for="quickCategory${category.id}">
                            <span class="color-dot" style="background-color: ${category.color}; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 8px;"></span>
                            ${category.name}
                        </label>
                    `;
                    categoriesContainer.appendChild(div);
                });
            });
        
        // Setup event listeners
        const allDayCheckbox = modalDiv.querySelector('#quickActivityAllDay');
        const timeFields = modalDiv.querySelector('#quickTimeFields');
        allDayCheckbox.addEventListener('change', function() {
            timeFields.style.display = this.checked ? 'none' : 'block';
        });

        const recurringCheckbox = modalDiv.querySelector('#quickActivityRecurring');
        const recurrenceFields = modalDiv.querySelector('#quickRecurrenceFields');
        recurringCheckbox.addEventListener('change', function() {
            recurrenceFields.style.display = this.checked ? 'block' : 'none';
        });
        
        // Show modal
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();
        
        // Clean up on hide
        modalDiv.addEventListener('hidden.bs.modal', function () {
            document.body.removeChild(modalDiv);
        });
    }

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

        if (activity.is_recurring && !activity.recurrence_end_date) {
            alert('Veuillez spécifier une date de fin pour l\'activité récurrente');
            return;
        }

        fetch('/api/activities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activity)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const modal = bootstrap.Modal.getInstance(document.querySelector('.modal'));
                modal.hide();
                updateCalendar();
            } else {
                alert(data.error || 'Erreur lors de l\'enregistrement de l\'activité');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Erreur lors de l\'enregistrement de l\'activité');
        });
    }

    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            
            // Sort activities by date and time
            activities.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA - dateB;
                }
                return (a.time || '').localeCompare(b.time || '');
            });
            
            // Clear existing activities
            document.querySelectorAll('.all-day-activities').forEach(container => container.innerHTML = '');
            document.querySelectorAll('.timed-activities').forEach(container => container.innerHTML = '');
            
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            
            activities.forEach(activity => {
                if (activity.is_recurring) {
                    handleRecurringActivity(activity, startDate, endDate);
                } else {
                    handleRegularActivity(activity, startDate, endDate);
                }
            });
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }

    function handleRecurringActivity(activity, startDate, endDate) {
        const activityStartDate = new Date(activity.date);
        let currentDate = new Date(Math.max(activityStartDate, startDate));
        const recurrenceEndDate = activity.recurrence_end_date ? new Date(activity.recurrence_end_date) : endDate;
        
        while (currentDate <= recurrenceEndDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const container = activity.is_all_day ?
                document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
            
            if (container) {
                const activityElement = createActivityElement({
                    ...activity,
                    date: dateStr,
                    is_recurring: true
                }, 'single');
                container.appendChild(activityElement);
            }
            
            // Increment date based on recurrence type
            switch (activity.recurrence_type) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
                case 'annually':
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                    break;
            }
        }
    }

    function handleRegularActivity(activity, startDate, endDate) {
        const activityStartDate = new Date(activity.date);
        const activityEndDate = activity.end_date ? new Date(activity.end_date) : activityStartDate;
        
        // Skip if activity is outside current month/view range
        if (activityStartDate > endDate || activityEndDate < startDate) {
            return;
        }
        
        let currentDate = new Date(Math.max(activityStartDate, startDate));
        const viewEndDate = new Date(Math.min(activityEndDate, endDate));
        
        while (currentDate <= viewEndDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const container = activity.is_all_day ?
                document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
            
            if (container) {
                let position = 'middle';
                if (currentDate.getTime() === activityStartDate.getTime()) {
                    position = 'start';
                } else if (currentDate.getTime() === activityEndDate.getTime()) {
                    position = 'end';
                }
                
                const activityElement = createActivityElement(activity, position);
                container.appendChild(activityElement);
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    function createActivityElement(activity, position) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity';
        
        const categoryColor = activity.categories.length > 0 ? activity.categories[0].color : '#6f42c1';
        const startDate = new Date(activity.date);
        const endDate = activity.end_date ? new Date(activity.end_date) : startDate;
        const isMultiDay = endDate > startDate;
        
        if (isMultiDay && !activity.is_recurring) {
            activityDiv.classList.add('multi-day');
            activityDiv.classList.add(position);
            activityDiv.style.backgroundColor = categoryColor;
        } else {
            activityDiv.style.backgroundColor = categoryColor;
        }
        
        if (position === 'start' || position === 'single') {
            let timeDisplay = '';
            if (!activity.is_all_day && activity.time) {
                timeDisplay = `${activity.time}${activity.end_time ? ' - ' + activity.end_time : ''}`;
            }
            
            activityDiv.innerHTML = `
                <div class="activity-content">
                    <div class="title">${activity.title}</div>
                    ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
                    ${activity.is_recurring ? '<i class="bi bi-arrow-repeat ms-1" title="Activité récurrente"></i>' : ''}
                </div>
            `;
        }
        
        activityDiv.addEventListener('click', () => showActivityDetails(activity));
        
        return activityDiv;
    }

    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    // Initial calendar render
    updateCalendar();
});
