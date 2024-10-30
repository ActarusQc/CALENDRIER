document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    
    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        document.getElementById('currentMonth').textContent = 
            new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.innerHTML = '';
        
        // Add empty cells for days before the first of the month
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarDates.appendChild(createDateCell());
        }
        
        // Add cells for each day of the month
        for (let date = 1; date <= lastDay.getDate(); date++) {
            calendarDates.appendChild(createDateCell(date));
        }
        
        fetchActivities(year, month);
    }
    
    function createDateCell(date) {
        const cell = document.createElement('div');
        cell.className = 'calendar-date';
        if (date) {
            const dateDiv = document.createElement('div');
            dateDiv.className = 'date-number';
            dateDiv.textContent = date;
            cell.appendChild(dateDiv);
            
            const activitiesDiv = document.createElement('div');
            activitiesDiv.className = 'activities';
            activitiesDiv.setAttribute('data-date', `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`);
            cell.appendChild(activitiesDiv);
        }
        return cell;
    }
    
    function getActivityClass(category) {
        const categoryMap = {
            'Walking Club': 'walking-club',
            'Bingo': 'bingo',
            'Social': 'social',
            'Coffee Time': 'coffee-time'
        };
        return categoryMap[category] || 'default';
    }
    
    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            
            activities.forEach(activity => {
                const activityDate = new Date(activity.date);
                if (activityDate.getFullYear() === year && activityDate.getMonth() === month) {
                    const dateCell = document.querySelector(`[data-date="${activity.date}"]`);
                    if (dateCell) {
                        const activityDiv = document.createElement('div');
                        activityDiv.className = `activity ${getActivityClass(activity.category)}`;
                        
                        const timeSpan = document.createElement('div');
                        timeSpan.className = 'time';
                        timeSpan.textContent = activity.time;
                        
                        const titleSpan = document.createElement('div');
                        titleSpan.textContent = activity.title;
                        
                        if (activity.location) {
                            const locationSpan = document.createElement('div');
                            locationSpan.className = 'location';
                            locationSpan.textContent = activity.location;
                            activityDiv.appendChild(locationSpan);
                        }
                        
                        activityDiv.appendChild(timeSpan);
                        activityDiv.appendChild(titleSpan);
                        dateCell.querySelector('.activities').appendChild(activityDiv);
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }
    
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });
    
    updateCalendar();
});
