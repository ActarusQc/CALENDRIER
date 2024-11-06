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

    document.getElementById('prevMonth').addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
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
        
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        
        switch(currentView) {
            case 'business-week':
                dayNames.slice(1, 6).forEach(day => {
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
                dayNames.forEach(day => {
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

    function createDateCell(date, isOtherMonth = false) {
        const cell = document.createElement('div');
        cell.className = 'calendar-date' + (isOtherMonth ? ' other-month' : '');
        
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
            
            const timedDiv = document.createElement('div');
            timedDiv.className = 'timed-activities';
            timedDiv.setAttribute('data-date', formattedDate);
            cell.appendChild(timedDiv);
        }
        
        return cell;
    }

    function renderMonthView() {
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.style.gridTemplateColumns = 'repeat(7, 1fr)';
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Add days from previous month
        const prevMonth = new Date(year, month, 0);
        const daysFromPrevMonth = firstDay.getDay();
        for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
            const prevDate = new Date(prevMonth);
            prevDate.setDate(prevMonth.getDate() - i);
            calendarDates.appendChild(createDateCell(prevDate, true));
        }
        
        // Fill in days of the month
        for (let date = 1; date <= lastDay.getDate(); date++) {
            const cellDate = new Date(year, month, date);
            calendarDates.appendChild(createDateCell(cellDate));
        }
        
        // Add days from next month
        const remainingDays = 42 - (daysFromPrevMonth + lastDay.getDate()); // 42 = 6 rows × 7 days
        for (let i = 1; i <= remainingDays; i++) {
            const nextDate = new Date(year, month + 1, i);
            calendarDates.appendChild(createDateCell(nextDate, true));
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
            const isOtherMonth = date.getMonth() !== currentDate.getMonth();
            calendarDates.appendChild(createDateCell(date, isOtherMonth));
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
            const isOtherMonth = date.getMonth() !== currentDate.getMonth();
            calendarDates.appendChild(createDateCell(date, isOtherMonth));
        }
    }

    function renderDayView() {
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.innerHTML = '';
        calendarDates.style.gridTemplateColumns = '1fr';
        
        const isOtherMonth = currentDate.getMonth() !== new Date().getMonth();
        calendarDates.appendChild(createDateCell(currentDate, isOtherMonth));
    }

    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            
            // Clear existing activities
            document.querySelectorAll('.all-day-activities').forEach(container => container.innerHTML = '');
            document.querySelectorAll('.timed-activities').forEach(container => container.innerHTML = '');
            
            // Sort activities by date and all-day status
            activities.sort((a, b) => {
                if (a.is_all_day !== b.is_all_day) {
                    return a.is_all_day ? -1 : 1;
                }
                return new Date(a.date) - new Date(b.date);
            });
            
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            
            // Group multi-day activities for better positioning
            const multiDayActivities = activities.filter(activity => {
                const hasEndDate = activity.end_date && new Date(activity.end_date) > new Date(activity.date);
                return hasEndDate;
            });
            
            // Display single-day activities first
            activities.filter(activity => !multiDayActivities.includes(activity))
                     .forEach(activity => displayActivity(activity, startDate, endDate));
            
            // Then display multi-day activities
            multiDayActivities.forEach(activity => displayActivity(activity, startDate, endDate));
            
            // Adjust heights for all-day events
            adjustAllDayEventHeights();
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }

    function adjustAllDayEventHeights() {
        const allDayContainers = document.querySelectorAll('.all-day-activities');
        allDayContainers.forEach(container => {
            const events = container.querySelectorAll('.activity');
            if (events.length > 0) {
                const totalHeight = events.length * 32 + (events.length - 1) * 4; // height + gap
                container.style.minHeight = `${totalHeight}px`;
            }
        });
    }

    function displayActivity(activity, startDate, endDate) {
        const activityStartDate = new Date(activity.date);
        const activityEndDate = activity.end_date ? new Date(activity.end_date) : activityStartDate;
        
        if (activityStartDate > endDate || activityEndDate < startDate) {
            return;
        }
        
        let currentDate = new Date(Math.max(activityStartDate, startDate));
        const viewEndDate = new Date(Math.min(activityEndDate, endDate));
        
        const isMultiDay = activity.end_date && new Date(activity.end_date) > new Date(activity.date);
        let verticalPosition = 0;
        
        // Calculate vertical position for multi-day events
        if (isMultiDay && activity.is_all_day) {
            const allDayContainer = document.querySelector(`div.all-day-activities[data-date="${currentDate.toISOString().split('T')[0]}"]`);
            if (allDayContainer) {
                verticalPosition = allDayContainer.querySelectorAll('.activity').length;
            }
        }
        
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
                
                if (isMultiDay && activity.is_all_day) {
                    activityElement.style.top = `${verticalPosition * 32 + verticalPosition * 4}px`; // height + gap
                }
                
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
        
        if (isMultiDay) {
            activityDiv.classList.add('multi-day', position);
            activityDiv.style.zIndex = '1';
            activityDiv.style.backgroundColor = categoryColor;
        } else {
            activityDiv.style.backgroundColor = categoryColor;
        }
        
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
        
        activityDiv.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showActivityDetails(activity);
        });
        
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
                    <div class="modal-body text-white">
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
                        ${activity.categories && activity.categories.length > 0 ? `
                            <div class="mb-3">
                                <strong>Catégories:</strong>
                                <div class="d-flex flex-wrap gap-2 mt-1">
                                    ${activity.categories.map(cat => `
                                        <span class="badge" style="background-color: ${cat.color}">${cat.name}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${activity.notes ? `
                            <div class="mb-3">
                                <strong>Notes:</strong>
                                <div class="mt-1">${activity.notes}</div>
                            </div>
                        ` : ''}
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

        // Add modal to document
        document.body.appendChild(modalDiv);
        
        // Setup all-day checkbox behavior
        const allDayCheckbox = modalDiv.querySelector('#quickActivityAllDay');
        const timeFields = modalDiv.querySelector('#quickTimeFields');
        allDayCheckbox.addEventListener('change', function() {
            timeFields.style.display = this.checked ? 'none' : 'block';
        });
        
        // Load locations and categories
        fetch('/api/locations')
            .then(response => response.json())
            .then(locations => {
                const locationSelect = modalDiv.querySelector('#quickActivityLocation');
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
                const categoriesContainer = modalDiv.querySelector('#quickActivityCategories');
                categories.forEach(category => {
                    const div = document.createElement('div');
                    div.className = 'form-check';
                    div.innerHTML = `
                        <input class="form-check-input" type="checkbox" value="${category.id}" id="quickCategory${category.id}">
                        <label class="form-check-label text-white">
                            <span class="color-dot" style="background-color: ${category.color}; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 8px;"></span>
                            ${category.name}
                        </label>
                    `;
                    categoriesContainer.appendChild(div);
                });
            });
        
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();
        
        modalDiv.addEventListener('hidden.bs.modal', function () {
            document.body.removeChild(modalDiv);
        });
    }

    // Initialize calendar
    updateCalendar();
});
