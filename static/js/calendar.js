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

    function createDateCell(date) {
        const dateCell = document.createElement('div');
        dateCell.className = 'calendar-date';
        
        // Add date number
        const dateNumber = document.createElement('a');
        dateNumber.href = '#';
        dateNumber.className = 'date-number';
        dateNumber.textContent = date.getDate();
        dateNumber.addEventListener('click', (e) => {
            e.preventDefault();
            showAddActivityModal(date.toISOString().split('T')[0]);
        });
        dateCell.appendChild(dateNumber);
        
        // Create containers for all-day and timed activities
        const allDayContainer = document.createElement('div');
        allDayContainer.className = 'all-day-activities';
        allDayContainer.setAttribute('data-date', date.toISOString().split('T')[0]);
        
        const timedContainer = document.createElement('div');
        timedContainer.className = 'timed-activities';
        timedContainer.setAttribute('data-date', date.toISOString().split('T')[0]);
        
        dateCell.appendChild(allDayContainer);
        dateCell.appendChild(timedContainer);
        
        return dateCell;
    }

    // Rest of the calendar.js code remains the same...
});
