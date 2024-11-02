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
            
            const allDayDiv = document.createElement('div');
            allDayDiv.className = 'all-day-activities';
            cell.appendChild(allDayDiv);
            
            const activitiesDiv = document.createElement('div');
            activitiesDiv.className = 'timed-activities';
            const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
            activitiesDiv.setAttribute('data-date', formattedDate);
            allDayDiv.setAttribute('data-date', formattedDate);
            cell.appendChild(activitiesDiv);
        }
        return cell;
    }

    function createActivityElement(activity) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity';
        
        // Use the first category's color, or default if no categories
        const categoryColor = activity.categories.length > 0 ? activity.categories[0].color : '#6f42c1';
        activityDiv.style.backgroundColor = categoryColor;
        activityDiv.style.borderLeftColor = categoryColor;
        activityDiv.style.color = '#ffffff';
        
        if (activity.is_all_day) {
            activityDiv.classList.add('all-day');
        }
        
        let timeHtml = '';
        if (!activity.is_all_day && activity.time) {
            timeHtml = `<span class="time">${activity.time}</span>`;
        }
        
        activityDiv.innerHTML = `
            ${timeHtml}
            <span class="title">${activity.title}</span>
            ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
        `;
        
        // Add click handler for activity details
        activityDiv.addEventListener('click', () => {
            const modalDiv = document.createElement('div');
            modalDiv.className = 'modal fade';
            modalDiv.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title text-white">${activity.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-white">
                            <p><strong>Date:</strong> ${activity.date}</p>
                            <p><strong>Time:</strong> ${activity.is_all_day ? 'All day' : (activity.time || 'Not specified')}</p>
                            <p><strong>Location:</strong> ${activity.location || 'Not specified'}</p>
                            <p><strong>Categories:</strong> ${activity.categories.map(c => c.name).join(', ')}</p>
                            <p><strong>Notes:</strong> ${activity.notes || 'No notes'}</p>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalDiv);
            const modal = new bootstrap.Modal(modalDiv);
            modal.show();
            modalDiv.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modalDiv);
            });
        });
        
        return activityDiv;
    }
    
    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            
            activities.forEach(activity => {
                const activityDate = new Date(activity.date);
                if (activityDate.getFullYear() === year && activityDate.getMonth() === month) {
                    const dateStr = activity.date;
                    const container = activity.is_all_day ?
                        document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                        document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                    
                    if (container) {
                        const activityElement = createActivityElement(activity);
                        container.appendChild(activityElement);
                    }
                }
            });
            
            // Sort timed activities by time
            document.querySelectorAll('.timed-activities').forEach(container => {
                const activities = Array.from(container.children);
                activities.sort((a, b) => {
                    const timeA = a.querySelector('.time')?.textContent || '';
                    const timeB = b.querySelector('.time')?.textContent || '';
                    return timeA.localeCompare(timeB);
                });
                activities.forEach(activity => container.appendChild(activity));
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
