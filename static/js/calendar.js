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
            const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
            activitiesDiv.setAttribute('data-date', formattedDate);
            cell.appendChild(activitiesDiv);
        }
        return cell;
    }

    function createActivityElement(activity) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity';
        activityDiv.style.cursor = 'pointer';
        
        // Add category classes
        if (activity.categories && activity.categories.length > 0) {
            activity.categories.forEach(category => {
                activityDiv.classList.add(getActivityClass(category));
            });
        }
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = activity.time || '';
        activityDiv.appendChild(timeSpan);
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = activity.title;
        activityDiv.appendChild(titleSpan);
        
        if (activity.location) {
            const locationSpan = document.createElement('div');
            locationSpan.className = 'location';
            locationSpan.textContent = activity.location;
            activityDiv.appendChild(locationSpan);
        }
        
        // Add click handler
        activityDiv.addEventListener('click', () => {
            const modalDiv = document.createElement('div');
            modalDiv.className = 'modal fade';
            modalDiv.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content bg-dark text-white">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title">${activity.title}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p><strong>Date:</strong> ${activity.date}</p>
                            <p><strong>Heure:</strong> ${activity.time || 'Non spécifié'}</p>
                            <p><strong>Lieu:</strong> ${activity.location || 'Non spécifié'}</p>
                            <p><strong>Catégories:</strong> ${activity.categories.join(', ')}</p>
                            <p><strong>Notes:</strong> ${activity.notes || 'Aucune note'}</p>
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
            console.log('Fetching activities...');
            const response = await fetch('/api/activities');
            const activities = await response.json();
            console.log('Received activities:', activities);
            
            activities.forEach(activity => {
                const activityDate = new Date(activity.date);
                console.log('Processing activity:', activity);
                if (activityDate.getFullYear() === year && activityDate.getMonth() === month) {
                    const dateStr = activity.date;
                    const dateCell = document.querySelector(`div.activities[data-date="${dateStr}"]`);
                    if (dateCell) {
                        console.log('Found date cell:', dateCell, 'for date:', dateStr);
                        const activityElement = createActivityElement(activity);
                        dateCell.appendChild(activityElement);
                    } else {
                        console.log('No date cell found for:', dateStr);
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }
    
    function getActivityClass(category) {
        const categoryMap = {
            'Cours de langue': 'walking-club',
            'Activités sociales': 'social',
            'Activités physiques': 'walking-club',
            'Ateliers': 'coffee-time'
        };
        return categoryMap[category] || 'default';
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
