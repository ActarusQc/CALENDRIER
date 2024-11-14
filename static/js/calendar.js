document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    let currentView = 'month';
    let activeCategories = new Set(['all']);

    loadCategoryFilters();
    updateCalendar();

    // Navigation button event listeners
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    // View switching buttons
    document.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', function() {
            currentView = this.dataset.view;
            document.querySelectorAll('[data-view]').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            updateCalendar();
        });
    });

    async function loadCategoryFilters() {
        try {
            const response = await fetch('/api/categories');
            if (!response.ok) {
                throw new Error('Failed to load categories');
            }
            const categories = await response.json();
            
            const filterContainer = document.getElementById('categoryFilters');
            filterContainer.innerHTML = '';
            
            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = 'btn category-btn me-2';
                button.setAttribute('data-category', category.id);
                button.style.backgroundColor = category.color;
                button.textContent = category.name;
                button.addEventListener('click', () => toggleCategoryFilter(category.id));
                filterContainer.appendChild(button);
            });

            document.querySelector('.show-all-btn').addEventListener('click', resetCategoryFilters);
        } catch (error) {
            console.error('Error loading category filters:', error);
            showError('Failed to load categories. Please try again later.');
        }
    }

    function toggleCategoryFilter(categoryId) {
        const button = document.querySelector(`[data-category="${categoryId}"]`);
        const showAllBtn = document.querySelector('.show-all-btn');
        
        if (!button) return;
        
        if (activeCategories.has('all')) {
            activeCategories.clear();
            showAllBtn.classList.remove('active');
        }
        
        const categoryIdStr = categoryId.toString();
        if (activeCategories.has(categoryIdStr)) {
            activeCategories.delete(categoryIdStr);
            button.classList.remove('active');
        } else {
            activeCategories.add(categoryIdStr);
            button.classList.add('active');
        }
        
        if (activeCategories.size === 0) {
            resetCategoryFilters();
            return;
        }
        
        updateCalendar();
    }

    function resetCategoryFilters() {
        activeCategories.clear();
        activeCategories.add('all');
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.show-all-btn').classList.add('active');
        updateCalendar();
    }

    function shouldDisplayActivity(activity) {
        if (activeCategories.has('all')) return true;
        if (!activity.categories || activity.categories.length === 0) return false;
        
        return activity.categories.some(category => 
            activeCategories.has(category.id.toString())
        );
    }

    function showError(message) {
        const existingError = document.querySelector('.calendar-container .alert');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = message;
        document.querySelector('.calendar-container').prepend(errorDiv);
    }

    function updateCalendarHeader() {
        const daysContainer = document.querySelector('.calendar-days');
        if (!daysContainer) return;
        
        const days = {
            'month': ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
            'week': ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
            'business-week': ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
            'day': [currentDate.toLocaleString('fr-FR', { weekday: 'long' })]
        };

        daysContainer.innerHTML = '';
        days[currentView].forEach(day => {
            const div = document.createElement('div');
            div.textContent = day;
            daysContainer.appendChild(div);
        });

        const monthYear = currentDate.toLocaleString('fr-FR', { 
            month: 'long', 
            year: 'numeric' 
        });
        document.getElementById('currentMonth').textContent = 
            monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    }

    function updateCalendar() {
        const calendarGrid = document.querySelector('.calendar-grid');
        if (!calendarGrid) return;
        
        calendarGrid.className = `calendar-grid ${currentView}`;
        updateCalendarHeader();
        
        const calendarDates = document.getElementById('calendarDates');
        if (!calendarDates) return;
        
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

        fetchActivities(currentDate.getFullYear(), currentDate.getMonth());
    }

    async function fetchActivities(year, month) {
        try {
            // Remove any existing error messages
            const existingError = document.querySelector('.calendar-container .alert');
            if (existingError) {
                existingError.remove();
            }

            // Fetch activities
            const response = await fetch('/api/activities');
            if (!response.ok) {
                throw new Error('Failed to load activities');
            }

            const activities = await response.json();
            if (!Array.isArray(activities)) {
                throw new Error('Invalid activities data');
            }

            // Clear existing activities
            document.querySelectorAll('.all-day-activities, .timed-activities')
                .forEach(container => {
                    container.innerHTML = '';
                    container.style.height = 'auto';
                });

            // Filter and display activities
            activities.forEach(activity => {
                if (!shouldDisplayActivity(activity)) return;
                
                const startDate = new Date(activity.date);
                const endDate = activity.end_date ? new Date(activity.end_date) : startDate;
                const dateStr = activity.date;
                
                const container = activity.is_all_day ? 
                    document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                    document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                
                if (container) {
                    const element = createActivityElement(activity, dateStr, startDate, endDate);
                    container.appendChild(element);
                }
            });

        } catch (error) {
            console.error('Error loading activities:', error);
            showError('Failed to load activities. Please try again later.');
        }
    }

    function createActivityElement(activity, dateStr, startDate, endDate) {
        const element = document.createElement('div');
        element.className = 'activity';
        element.setAttribute('data-activity-id', activity.id);
        
        const categoryColor = activity.categories?.[0]?.color || '#6f42c1';
        element.style.backgroundColor = categoryColor;
        
        if (activity.is_all_day) {
            element.classList.add('all-day');
        }
        
        const currentDate = new Date(dateStr);
        const isStart = startDate.toDateString() === currentDate.toDateString();
        const isEnd = endDate.toDateString() === currentDate.toDateString();
        
        if (startDate < endDate) {
            element.classList.add('multi-day');
            if (isStart) {
                element.classList.add('start');
            } else if (isEnd) {
                element.classList.add('end');
            } else {
                element.classList.add('middle');
            }
        }
        
        element.innerHTML = `
            <div class="activity-content">
                <div class="title">${activity.title}</div>
                ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
                ${activity.is_recurring ? '<i class="bi bi-arrow-repeat ms-1"></i>' : ''}
                ${activity.enable_reminder ? '<i class="bi bi-bell ms-1"></i>' : ''}
            </div>
        `;
        
        element.addEventListener('click', () => showActivityDetails(activity));
        return element;
    }

    function renderMonthView() {
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.style.gridTemplateColumns = 'repeat(7, 1fr)';
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarDates.appendChild(createDateCell());
        }
        
        for (let date = 1; date <= lastDay.getDate(); date++) {
            calendarDates.appendChild(createDateCell(new Date(year, month, date)));
        }
        
        const remainingDays = (7 - ((firstDay.getDay() + lastDay.getDate()) % 7)) % 7;
        for (let i = 0; i < remainingDays; i++) {
            calendarDates.appendChild(createDateCell());
        }
    }

    function renderWeekView() {
        const calendarDates = document.getElementById('calendarDates');
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
        calendarDates.style.gridTemplateColumns = 'repeat(5, 1fr)';
        
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        startOfWeek.setDate(startOfWeek.getDate() + diff);
        
        for (let i = 0; i < 5; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            calendarDates.appendChild(createDateCell(date));
        }
    }

    function renderDayView() {
        const calendarDates = document.getElementById('calendarDates');
        calendarDates.style.gridTemplateColumns = '1fr';
        calendarDates.appendChild(createDateCell(currentDate));
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
            allDayDiv.setAttribute('data-date', date.toISOString().split('T')[0]);
            cell.appendChild(allDayDiv);
            
            const timedDiv = document.createElement('div');
            timedDiv.className = 'timed-activities';
            timedDiv.setAttribute('data-date', date.toISOString().split('T')[0]);
            cell.appendChild(timedDiv);
        }
        
        return cell;
    }

    function showActivityDetails(activity) {
        const modal = document.getElementById('activityDetailsModal');
        if (!modal) return;
        
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <h4 class="text-white">${activity.title}</h4>
            <div class="activity-details">
                <p>
                    <strong>Date:</strong> ${formatDate(activity.date)}
                    ${activity.end_date ? ` - ${formatDate(activity.end_date)}` : ''}
                </p>
                ${!activity.is_all_day ? `
                    <p>
                        <strong>Time:</strong> ${activity.time || ''}
                        ${activity.end_time ? ` - ${activity.end_time}` : ''}
                    </p>
                ` : '<p><strong>Time:</strong> All day</p>'}
                ${activity.location ? `<p><strong>Location:</strong> ${activity.location}</p>` : ''}
                ${activity.notes ? `<p><strong>Notes:</strong> ${activity.notes}</p>` : ''}
                ${activity.enable_reminder ? `
                    <p>
                        <strong>Reminder:</strong> ${activity.reminder_minutes} minutes before the event
                    </p>
                ` : ''}
                ${activity.categories && activity.categories.length > 0 ? `
                    <p><strong>Categories:</strong></p>
                    <div class="d-flex flex-wrap gap-1 mb-3">
                        ${activity.categories.map(category => `
                            <span class="badge" style="background-color: ${category.color}">${category.name}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    }
});

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });
}
