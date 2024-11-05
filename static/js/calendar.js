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
    }

    function updateCalendar() {
        const calendarGrid = document.querySelector('.calendar-grid');
        calendarGrid.className = 'calendar-grid ' + currentView;
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        document.getElementById('currentMonth').textContent = 
            new Date(year, month).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
            .replace(/^./, str => str.toUpperCase());
        
        updateCalendarHeader(currentView);
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.innerHTML = '';

        switch(currentView) {
            case 'month':
                renderMonthView(firstDay, lastDay);
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
        
        fetchActivities(year, month);
    }

    // ... rest of the existing code remains the same ...

    // Update the fetchActivities function to handle recurring events
    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            
            activities.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA - dateB;
                }
                return (a.time || '').localeCompare(b.time || '');
            });
            
            document.querySelectorAll('.all-day-activities').forEach(container => container.innerHTML = '');
            document.querySelectorAll('.timed-activities').forEach(container => container.innerHTML = '');
            
            const multiDayActivities = activities.filter(activity => activity.end_date || activity.is_recurring);
            const singleDayActivities = activities.filter(activity => !activity.end_date && !activity.is_recurring);
            
            // Handle multi-day and recurring activities
            multiDayActivities.forEach(activity => {
                if (activity.is_recurring) {
                    // Handle recurring activities
                    const startDate = new Date(activity.date);
                    const endDate = activity.recurrence_end_date ? new Date(activity.recurrence_end_date) : new Date(year, month + 1, 0);
                    let currentDate = new Date(startDate);
                    
                    while (currentDate <= endDate) {
                        if (currentDate.getFullYear() === year && currentDate.getMonth() === month) {
                            const dateStr = currentDate.toISOString().split('T')[0];
                            const container = activity.is_all_day ?
                                document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                                document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                            
                            if (container) {
                                const activityElement = createActivityElement({...activity, date: dateStr}, 'single');
                                container.appendChild(activityElement);
                            }
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
                } else if (activity.end_date) {
                    // Handle regular multi-day activities
                    const startDate = new Date(activity.date);
                    const endDate = new Date(activity.end_date);
                    let currentDate = new Date(startDate);
                    
                    while (currentDate <= endDate) {
                        if (currentDate.getFullYear() === year && currentDate.getMonth() === month) {
                            const dateStr = currentDate.toISOString().split('T')[0];
                            const container = activity.is_all_day ?
                                document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                                document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                            
                            if (container) {
                                let position = 'middle';
                                if (currentDate.getTime() === startDate.getTime()) {
                                    position = 'start';
                                } else if (currentDate.getTime() === endDate.getTime()) {
                                    position = 'end';
                                }
                                
                                const activityElement = createActivityElement(activity, position);
                                container.appendChild(activityElement);
                            }
                        }
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                }
            });
            
            // Handle single-day activities
            singleDayActivities.forEach(activity => {
                const activityDate = new Date(activity.date);
                if (activityDate.getFullYear() === year && activityDate.getMonth() === month) {
                    const dateStr = activityDate.toISOString().split('T')[0];
                    const container = activity.is_all_day ?
                        document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                        document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                    
                    if (container) {
                        const activityElement = createActivityElement(activity, 'single');
                        container.appendChild(activityElement);
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }
    
    // ... rest of the existing code remains the same ...
    
    updateCalendar();
});
