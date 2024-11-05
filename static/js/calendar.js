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
        
        if (view === 'business-week') {
            // Show only Monday-Friday
            ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].forEach(day => {
                const div = document.createElement('div');
                div.textContent = day;
                daysContainer.appendChild(div);
            });
            daysContainer.style.gridTemplateColumns = 'repeat(5, 1fr)';
        } else if (view === 'day') {
            // Show only current day name
            const dayName = currentDate.toLocaleString('fr-FR', { weekday: 'long' });
            const div = document.createElement('div');
            div.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            daysContainer.appendChild(div);
            daysContainer.style.gridTemplateColumns = '1fr';
        } else {
            // Full week for month and week views
            daysContainer.style.gridTemplateColumns = 'repeat(7, 1fr)';
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
        calendarDates.innerHTML = ''; // Clear existing content
        calendarDates.style.gridTemplateColumns = 'repeat(5, 1fr)';
        
        // Find Monday of current week
        const startOfWeek = new Date(currentDate);
        const diff = startOfWeek.getDay() === 0 ? -6 : 1 - startOfWeek.getDay(); // If Sunday, go back to previous Monday
        startOfWeek.setDate(startOfWeek.getDate() + diff);
        
        // Create 5 columns for Monday through Friday
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
        // ... rest of the modal code ...
    }

    function quickSaveActivity() {
        // ... rest of the save activity code ...
    }

    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            
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
        switch(currentView) {
            case 'day':
                currentDate.setDate(currentDate.getDate() - 1);
                break;
            case 'week':
            case 'business-week':
                currentDate.setDate(currentDate.getDate() - 7);
                break;
            default:
                currentDate.setMonth(currentDate.getMonth() - 1);
        }
        updateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        switch(currentView) {
            case 'day':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'week':
            case 'business-week':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            default:
                currentDate.setMonth(currentDate.getMonth() + 1);
        }
        updateCalendar();
    });

    // Initial calendar render
    updateCalendar();
});
