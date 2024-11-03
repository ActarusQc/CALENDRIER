document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    
    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        document.getElementById('currentMonth').textContent = 
            new Date(year, month).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
            .replace(/^./, str => str.toUpperCase());
        
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

            // Add quick add button if user has permission
            if (window.userCanManageActivities) {
                const quickAddBtn = document.createElement('button');
                quickAddBtn.className = 'quick-add-btn';
                quickAddBtn.innerHTML = '+';
                quickAddBtn.onclick = (e) => {
                    e.stopPropagation();
                    const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
                    openQuickAddModal(dateStr);
                };
                cell.appendChild(quickAddBtn);
            }
        }
        return cell;
    }

    function openQuickAddModal(date) {
        document.getElementById('date').value = date;
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        modal.show();
    }
    
    function createActivityElement(activity, position) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity';
        
        const categoryColor = activity.categories.length > 0 ? activity.categories[0].color : '#6f42c1';
        const startDate = new Date(activity.date);
        const endDate = activity.end_date ? new Date(activity.end_date) : startDate;
        const isMultiDay = endDate > startDate;
        
        if (isMultiDay) {
            activityDiv.classList.add('multi-day');
            activityDiv.classList.add(position);
            activityDiv.style.backgroundColor = categoryColor;
            
            // Only show content on the first day
            if (position === 'start') {
                activityDiv.innerHTML = `
                    <div class="activity-content">
                        <div class="title">${activity.title}</div>
                        ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
                    </div>
                `;
            }
            
            // Add title as tooltip for all segments
            activityDiv.title = `${activity.title}${activity.location ? ' - ' + activity.location : ''}`;
            
            // Calculate width for multi-day events
            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const remainingDays = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24)) + 1;
            
            if (position === 'start') {
                activityDiv.style.width = `calc(100% * ${totalDays})`;
            }
        } else {
            activityDiv.style.backgroundColor = categoryColor;
            activityDiv.innerHTML = `
                ${!activity.is_all_day && activity.time ? `<span class="time">${activity.time}</span>` : ''}
                <div class="activity-content">
                    <div class="title">${activity.title}</div>
                    ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
                </div>
            `;
        }
        
        // Add click handler for activity details
        activityDiv.addEventListener('click', () => showActivityDetails(activity));
        
        return activityDiv;
    }
    
    function showActivityDetails(activity) {
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
                        <p><strong>Date:</strong> ${activity.date}${activity.end_date ? ' to ' + activity.end_date : ''}</p>
                        <p><strong>Time:</strong> ${activity.is_all_day ? 'All day' : (activity.time + (activity.end_time ? ' - ' + activity.end_time : '') || 'Not specified')}</p>
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
    }
    
    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            
            // Sort activities by date and time
            activities.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA - dateB;
                }
                return (a.time || '').localeCompare(b.time || '');
            });
            
            const processedEvents = new Set();
            
            activities.forEach(activity => {
                const activityDate = new Date(activity.date);
                const endDate = activity.end_date ? new Date(activity.end_date) : activityDate;
                
                // For multi-day events, add to each day in the range
                let currentDate = new Date(activityDate);
                while (currentDate <= endDate) {
                    if (currentDate.getFullYear() === year && currentDate.getMonth() === month) {
                        const dateStr = currentDate.toISOString().split('T')[0];
                        const container = activity.is_all_day ?
                            document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                            document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                        
                        if (container && !processedEvents.has(activity.id + dateStr)) {
                            let position = 'single';
                            if (endDate > activityDate) {
                                if (currentDate.getTime() === activityDate.getTime()) {
                                    position = 'start';
                                } else if (currentDate.getTime() === endDate.getTime()) {
                                    position = 'end';
                                } else {
                                    position = 'middle';
                                }
                            }
                            
                            const activityElement = createActivityElement(activity, position);
                            container.appendChild(activityElement);
                            processedEvents.add(activity.id + dateStr);
                        }
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }
    
    // Event handlers for month navigation
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
