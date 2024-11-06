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
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarDates.appendChild(createDateCell());
        }
        
        // Add cells for each day of the month
        for (let date = 1; date <= lastDay.getDate(); date++) {
            const cellDate = new Date(year, month, date);
            calendarDates.appendChild(createDateCell(cellDate));
        }

        // Add empty cells for remaining days to complete the grid
        const remainingDays = (7 - ((firstDay.getDay() + lastDay.getDate()) % 7)) % 7;
        for (let i = 0; i < remainingDays; i++) {
            calendarDates.appendChild(createDateCell());
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
            
            const timedDiv = document.createElement('div');
            timedDiv.className = 'timed-activities';
            timedDiv.setAttribute('data-date', formattedDate);
            cell.appendChild(timedDiv);
        }
        
        return cell;
    }

    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            
            // Clear existing activities
            document.querySelectorAll('.all-day-activities').forEach(container => container.innerHTML = '');
            document.querySelectorAll('.timed-activities').forEach(container => container.innerHTML = '');
            
            // Calculate view range
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            
            // Sort activities by date and duration (longer events first)
            activities.sort((a, b) => {
                const aDuration = a.end_date ? (new Date(a.end_date) - new Date(a.date)) : 0;
                const bDuration = b.end_date ? (new Date(b.end_date) - new Date(b.date)) : 0;
                return bDuration - aDuration;
            });
            
            // Group activities by date and type
            const groupedActivities = groupActivitiesByDate(activities, startDate, endDate);
            
            // Display activities in their respective containers
            Object.entries(groupedActivities).forEach(([dateStr, dateActivities]) => {
                const allDayContainer = document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`);
                const timedContainer = document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                
                if (allDayContainer && timedContainer) {
                    // Process all-day events first
                    dateActivities.allDay.forEach(activity => {
                        displayActivity(activity, startDate, endDate);
                    });
                    
                    // Then process timed events
                    dateActivities.timed.forEach(activity => {
                        displayActivity(activity, startDate, endDate);
                    });
                }
            });
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }

    function groupActivitiesByDate(activities, startDate, endDate) {
        const grouped = {};
        
        activities.forEach(activity => {
            const activityStartDate = new Date(activity.date);
            const activityEndDate = activity.end_date ? new Date(activity.end_date) : activityStartDate;
            
            let currentDate = new Date(Math.max(activityStartDate, startDate));
            const viewEndDate = new Date(Math.min(activityEndDate, endDate));
            
            while (currentDate <= viewEndDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                
                if (!grouped[dateStr]) {
                    grouped[dateStr] = {
                        allDay: [],
                        timed: []
                    };
                }
                
                // Add to appropriate array only once per date
                const array = activity.is_all_day ? grouped[dateStr].allDay : grouped[dateStr].timed;
                if (!array.some(a => a.id === activity.id)) {
                    array.push({
                        ...activity,
                        displayDate: new Date(currentDate)
                    });
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });
        
        return grouped;
    }

    function displayActivity(activity, startDate, endDate) {
        const activityStartDate = new Date(activity.date);
        const activityEndDate = activity.end_date ? new Date(activity.end_date) : activityStartDate;
        const displayDate = activity.displayDate || activityStartDate;
        
        const dateStr = displayDate.toISOString().split('T')[0];
        const container = activity.is_all_day ?
            document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
            document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
        
        if (container) {
            let position = 'single';
            if (activityEndDate > activityStartDate) {
                if (displayDate.getTime() === activityStartDate.getTime()) {
                    position = 'start';
                } else if (displayDate.getTime() === activityEndDate.getTime()) {
                    position = 'end';
                } else {
                    position = 'middle';
                }
            }
            
            const activityElement = createActivityElement(activity, position);
            container.appendChild(activityElement);
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
            activityDiv.style.zIndex = '1';
        } else {
            activityDiv.style.backgroundColor = categoryColor;
        }
        
        // Add content only for start or single events
        if (position === 'start' || position === 'single') {
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

    // Set up navigation buttons
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    // Initialize calendar
    document.querySelector('[data-view="month"]').classList.add('active');
    updateCalendar();
});
