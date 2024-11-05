document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    let currentView = 'month';

    document.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', function() {
            const view = this.dataset.view;
            currentView = view;
            
            document.querySelectorAll('[data-view]').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            updateCalendar();
        });
    });

    function updateCalendar() {
        const calendarGrid = document.querySelector('.calendar-grid');
        calendarGrid.className = 'calendar-grid ' + currentView;
        
        updateCalendarHeader();
        
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

    function updateCalendarHeader() {
        const daysContainer = document.querySelector('.calendar-days');
        daysContainer.innerHTML = '';
        
        switch(currentView) {
            case 'business-week':
                ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].forEach(day => {
                    const div = document.createElement('div');
                    div.textContent = day;
                    daysContainer.appendChild(div);
                });
                break;
            case 'day':
                const dayName = currentDate.toLocaleString('fr-FR', { weekday: 'long' });
                const div = document.createElement('div');
                div.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                daysContainer.appendChild(div);
                break;
            default:
                ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].forEach(day => {
                    const div = document.createElement('div');
                    div.textContent = day;
                    daysContainer.appendChild(div);
                });
        }

        const monthYear = currentDate.toLocaleString('fr-FR', { 
            month: 'long', 
            year: 'numeric' 
        }).replace(/^./, str => str.toUpperCase());
        
        document.getElementById('currentMonth').textContent = monthYear;
    }

    function renderMonthView() {
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.style.gridTemplateColumns = 'repeat(7, 1fr)';
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarDates.appendChild(createDateCell());
        }
        
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
        const diff = startOfWeek.getDay() === 0 ? -6 : 1 - startOfWeek.getDay();
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

    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            
            document.querySelectorAll('.all-day-activities').forEach(container => container.innerHTML = '');
            document.querySelectorAll('.timed-activities').forEach(container => container.innerHTML = '');
            
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            
            activities.forEach(activity => {
                displayActivity(activity, startDate, endDate);
            });
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }

    function displayActivity(activity, startDate, endDate) {
        const activityStartDate = new Date(activity.date);
        const activityEndDate = activity.end_date ? new Date(activity.end_date) : activityStartDate;
        
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

    function showActivityDetails(activity) {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);">
                    <div class="modal-header border-bottom border-light border-opacity-25">
                        <h5 class="modal-title text-white fw-bold">${activity.title}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-white">
                            <div class="mb-3">
                                <strong>Date:</strong> ${activity.date}
                                ${activity.end_date ? ` - ${activity.end_date}` : ''}
                            </div>
                            ${!activity.is_all_day && activity.time ? `
                                <div class="mb-3">
                                    <strong>Heure:</strong> ${activity.time}
                                    ${activity.end_time ? ` - ${activity.end_time}` : ''}
                                </div>
                            ` : ''}
                            ${activity.is_all_day ? `
                                <div class="mb-3">
                                    <strong>Type:</strong> Toute la journée
                                </div>
                            ` : ''}
                            ${activity.location ? `
                                <div class="mb-3">
                                    <strong>Lieu:</strong> ${activity.location}
                                </div>
                            ` : ''}
                            ${activity.categories.length > 0 ? `
                                <div class="mb-3">
                                    <strong>Catégories:</strong>
                                    <div class="d-flex flex-wrap gap-2 mt-1">
                                        ${activity.categories.map(cat => `
                                            <span class="badge" style="background-color: ${cat.color}">${cat.name}</span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            ${activity.is_recurring ? `
                                <div class="mb-3">
                                    <strong>Récurrence:</strong> 
                                    ${activity.recurrence_type === 'daily' ? 'Quotidien' :
                                      activity.recurrence_type === 'weekly' ? 'Hebdomadaire' :
                                      activity.recurrence_type === 'monthly' ? 'Mensuel' :
                                      'Annuel'}
                                    ${activity.recurrence_end_date ? ` jusqu'au ${activity.recurrence_end_date}` : ''}
                                </div>
                            ` : ''}
                            ${activity.notes ? `
                                <div class="mb-3">
                                    <strong>Notes:</strong>
                                    <div class="mt-1">${activity.notes}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalDiv);
        
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();
        
        modalDiv.addEventListener('hidden.bs.modal', function () {
            document.body.removeChild(modalDiv);
        });
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
                                <div class="form-check">
                                    <input type="checkbox" class="form-check-input" id="quickActivityAllDay">
                                    <label class="form-check-label text-white">Toute la journée</label>
                                </div>
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
                            <div class="mb-3">
                                <div class="form-check mb-2">
                                    <input type="checkbox" class="form-check-input" id="quickActivityRecurring">
                                    <label class="form-check-label text-white">Activité récurrente</label>
                                </div>
                                <div id="recurrenceFields" style="display: none;">
                                    <select class="form-control bg-dark text-white mb-2" id="quickActivityRecurrenceType">
                                        <option value="daily">Quotidien</option>
                                        <option value="weekly">Hebdomadaire</option>
                                        <option value="monthly">Mensuel</option>
                                        <option value="annually">Annuel</option>
                                    </select>
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

        const allDayCheckbox = modalDiv.querySelector('#quickActivityAllDay');
        const timeFields = modalDiv.querySelector('#quickTimeFields');
        const recurringCheckbox = modalDiv.querySelector('#quickActivityRecurring');
        const recurrenceFields = modalDiv.querySelector('#recurrenceFields');

        allDayCheckbox.addEventListener('change', function() {
            timeFields.style.display = this.checked ? 'none' : 'block';
        });

        recurringCheckbox.addEventListener('change', function() {
            recurrenceFields.style.display = this.checked ? 'block' : 'none';
        });

        loadLocationsAndCategories(modalDiv);

        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        modalDiv.addEventListener('hidden.bs.modal', function () {
            document.body.removeChild(modalDiv);
        });
    }

    async function loadLocationsAndCategories(modalDiv) {
        try {
            const [locationsResponse, categoriesResponse] = await Promise.all([
                fetch('/api/locations'),
                fetch('/api/categories')
            ]);

            if (!locationsResponse.ok || !categoriesResponse.ok) {
                throw new Error('Failed to load data');
            }

            const locations = await locationsResponse.json();
            const categories = await categoriesResponse.json();

            const locationSelect = modalDiv.querySelector('#quickActivityLocation');
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = location.name;
                locationSelect.appendChild(option);
            });

            const categoriesContainer = modalDiv.querySelector('#quickActivityCategories');
            categories.forEach(category => {
                const div = document.createElement('div');
                div.className = 'form-check';
                div.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${category.id}" id="category${category.id}">
                    <label class="form-check-label text-white" for="category${category.id}">
                        <span class="color-dot" style="background-color: ${category.color}; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 8px;"></span>
                        ${category.name}
                    </label>
                `;
                categoriesContainer.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading locations and categories');
        }
    }

    async function quickSaveActivity() {
        const activity = {
            title: document.getElementById('quickActivityTitle').value,
            date: document.getElementById('quickActivityDate').value,
            end_date: document.getElementById('quickActivityEndDate').value || null,
            is_all_day: document.getElementById('quickActivityAllDay').checked,
            time: document.getElementById('quickActivityAllDay').checked ? null : document.getElementById('quickActivityTime').value,
            end_time: document.getElementById('quickActivityAllDay').checked ? null : document.getElementById('quickActivityEndTime').value,
            location_id: document.getElementById('quickActivityLocation').value || null,
            category_ids: Array.from(document.querySelectorAll('#quickActivityCategories input:checked')).map(cb => parseInt(cb.value)),
            is_recurring: document.getElementById('quickActivityRecurring').checked,
            recurrence_type: document.getElementById('quickActivityRecurring').checked ? document.getElementById('quickActivityRecurrenceType').value : null,
            recurrence_end_date: document.getElementById('quickActivityRecurring').checked ? document.getElementById('quickActivityRecurrenceEndDate').value : null
        };

        if (!activity.title || !activity.date) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        if (activity.end_date && activity.date > activity.end_date) {
            alert('La date de fin ne peut pas être antérieure à la date de début');
            return;
        }

        if (activity.is_recurring && !activity.recurrence_end_date) {
            alert('Veuillez spécifier une date de fin pour l\'activité récurrente');
            return;
        }

        try {
            const response = await fetch('/api/activities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(activity)
            });

            const data = await response.json();

            if (data.success) {
                const modal = bootstrap.Modal.getInstance(document.querySelector('.modal'));
                modal.hide();
                updateCalendar();
            } else {
                alert(data.error || 'Erreur lors de l\'enregistrement de l\'activité');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Erreur lors de l\'enregistrement de l\'activité');
        }
    }

    window.showAddActivityModal = showAddActivityModal;
    window.quickSaveActivity = quickSaveActivity;

    document.querySelector('[data-view="month"]').classList.add('active');
    updateCalendar();
});