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
        
        // Fill in empty cells before first day
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarDates.appendChild(createDateCell());
        }
        
        // Fill in days of the month
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
            calendarDates.appendChild(createDateCell(date));
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
            calendarDates.appendChild(createDateCell(date));
        }
    }

    function renderDayView() {
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.innerHTML = '';
        calendarDates.style.gridTemplateColumns = '1fr';
        
        calendarDates.appendChild(createDateCell(currentDate));
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
                container.style.height = `${events.length * 28}px`;
            } else {
                container.style.height = 'auto';
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
                    activityElement.style.top = `${verticalPosition * 28}px`;
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
        
        if (isMultiDay && !activity.is_recurring) {
            activityDiv.classList.add('multi-day', position);
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

    // Initialize calendar
    updateCalendar();
});
