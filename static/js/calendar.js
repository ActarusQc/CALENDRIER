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

    function updateCalendarHeader() {
        const monthYear = new Date(currentDate).toLocaleString('fr-FR', { 
            month: 'long', 
            year: 'numeric' 
        }).replace(/^./, str => str.toUpperCase());
        
        document.getElementById('currentMonth').textContent = monthYear;
    }

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
        calendarDates.innerHTML = '';
        calendarDates.style.gridTemplateColumns = 'repeat(5, 1fr)';
        
        // Find Monday of current week
        const startOfWeek = new Date(currentDate);
        const diff = startOfWeek.getDay() === 0 ? -6 : 1 - startOfWeek.getDay(); // Adjust to get to Monday
        startOfWeek.setDate(startOfWeek.getDate() + diff);
        
        // Create date cells for Monday through Friday
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
            const dateDiv = document.createElement('div');
            dateDiv.className = 'date-number';
            dateDiv.textContent = date.getDate();
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
            
            if (position === 'start') {
                activityDiv.innerHTML = `
                    <div class="activity-content">
                        <div class="title">${activity.title}</div>
                        ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
                    </div>
                `;
            } else {
                activityDiv.style.borderRadius = position === 'end' ? '0 4px 4px 0' : '0';
            }
            
            activityDiv.title = `${activity.title}${activity.location ? ' - ' + activity.location : ''}`;
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
        
        activityDiv.addEventListener('click', () => showActivityDetails(activity));
        
        return activityDiv;
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
            
            // Clear existing activities
            document.querySelectorAll('.all-day-activities').forEach(container => container.innerHTML = '');
            document.querySelectorAll('.timed-activities').forEach(container => container.innerHTML = '');
            
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            
            activities.forEach(activity => {
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
            });
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
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
                        <div class="d-flex flex-column gap-3">
                            <div class="d-flex align-items-center text-white">
                                <i class="bi bi-calendar3 me-3"></i>
                                <div>
                                    <div class="opacity-75 small">Date</div>
                                    <div>${activity.date}${activity.end_date ? ' → ' + activity.end_date : ''}</div>
                                </div>
                            </div>
                            <div class="d-flex align-items-center text-white">
                                <i class="bi bi-clock me-3"></i>
                                <div>
                                    <div class="opacity-75 small">Horaire</div>
                                    <div>${activity.is_all_day ? 'Toute la journée' : (activity.time + (activity.end_time ? ' - ' + activity.end_time : '') || 'Non spécifié')}</div>
                                </div>
                            </div>
                            <div class="d-flex align-items-center text-white">
                                <i class="bi bi-geo-alt me-3"></i>
                                <div>
                                    <div class="opacity-75 small">Lieu</div>
                                    <div>${activity.location || 'Non spécifié'}</div>
                                </div>
                            </div>
                            <div class="d-flex align-items-center text-white">
                                <i class="bi bi-tag me-3"></i>
                                <div>
                                    <div class="opacity-75 small">Catégories</div>
                                    <div>${activity.categories.map(c => c.name).join(', ') || 'Aucune catégorie'}</div>
                                </div>
                            </div>
                            ${activity.notes ? `
                            <div class="d-flex align-items-start text-white">
                                <i class="bi bi-sticky me-3 mt-1"></i>
                                <div>
                                    <div class="opacity-75 small">Notes</div>
                                    <div>${activity.notes}</div>
                                </div>
                            </div>
                            ` : ''}
                            ${activity.is_recurring ? `
                            <div class="d-flex align-items-start text-white">
                                <i class="bi bi-arrow-repeat me-3 mt-1"></i>
                                <div>
                                    <div class="opacity-75 small">Récurrence</div>
                                    <div>${activity.recurrence_type} jusqu'au ${activity.recurrence_end_date}</div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
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

    updateCalendar();
});
