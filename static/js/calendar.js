document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    let currentView = 'month';
    let activeCategories = new Set(['all']); // Track active category filters

    // Initialize category filters
    loadCategoryFilters();

    document.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', function() {
            const view = this.dataset.view;
            currentView = view;
            
            document.querySelectorAll('[data-view]').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            updateCalendarHeader();
            updateCalendar();
        });
    });

    async function loadCategoryFilters() {
        try {
            const response = await fetch('/api/categories');
            const categories = await response.json();
            
            const filterContainer = document.getElementById('categoryFilters');
            filterContainer.innerHTML = ''; // Clear existing filters
            
            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = 'btn category-btn me-2';
                button.setAttribute('data-category', category.id);
                button.style.backgroundColor = category.color;
                button.textContent = category.name;
                button.addEventListener('click', () => toggleCategoryFilter(category.id));
                filterContainer.appendChild(button);
            });

            // Add event listener for "Show All" button
            document.querySelector('.show-all-btn').addEventListener('click', resetCategoryFilters);
        } catch (error) {
            console.error('Error loading category filters:', error);
        }
    }

    function toggleCategoryFilter(categoryId) {
        const button = document.querySelector(`[data-category="${categoryId}"]`);
        if (!button) return;

        categoryId = categoryId.toString(); // Ensure consistent type

        if (activeCategories.has('all')) {
            // If "Show All" is active, clear it and add only this category
            activeCategories.clear();
            document.querySelector('.show-all-btn').classList.remove('active');
            activeCategories.add(categoryId);
            button.classList.add('active');
        } else if (activeCategories.has(categoryId)) {
            // If category is already active, remove it
            activeCategories.delete(categoryId);
            button.classList.remove('active');
            
            // If no categories are selected, revert to "Show All"
            if (activeCategories.size === 0) {
                resetCategoryFilters();
                return;
            }
        } else {
            // Add the category
            activeCategories.add(categoryId);
            button.classList.add('active');
        }

        updateCalendar(); // Refresh the calendar view
    }

    function resetCategoryFilters() {
        activeCategories.clear();
        activeCategories.add('all');
        
        // Update button states
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('.show-all-btn').classList.add('active');
        
        updateCalendar();
    }

    function shouldDisplayActivity(activity) {
        if (activeCategories.has('all')) {
            return true;
        }
        
        if (!activity.category_ids || activity.category_ids.length === 0) {
            return false;
        }
        
        // Convert all IDs to strings for consistent comparison
        const activityCategoryIds = activity.category_ids.map(String);
        return activityCategoryIds.some(id => activeCategories.has(id));
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
        
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarDates.appendChild(createDateCell());
        }
        
        for (let date = 1; date <= lastDay.getDate(); date++) {
            const cellDate = new Date(year, month, date);
            calendarDates.appendChild(createDateCell(cellDate));
        }

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
        const day = startOfWeek.getDay();
        const diff = day === 0 ? -6 : 1 - day;
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

    function showAddActivityModal(date) {
        window.location.href = `/admin?selected_date=${date}`;
    }

    function createActivityElement(activity, date) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity';
        
        const categoryColor = activity.categories.length > 0 ? activity.categories[0].color : '#6f42c1';
        const startDate = new Date(activity.date);
        const endDate = activity.end_date ? new Date(activity.end_date) : startDate;
        
        // Determine the position of this segment in a multi-day event
        let position = 'single';
        if (endDate > startDate) {
            const currentDate = new Date(date);
            const isStart = startDate.toDateString() === currentDate.toDateString();
            const isEnd = endDate.toDateString() === currentDate.toDateString();
            
            if (isStart && !isEnd) {
                position = 'start';
            } else if (!isStart && !isEnd) {
                position = 'middle';
            } else if (!isStart && isEnd) {
                position = 'end';
            }
            
            activityDiv.classList.add('multi-day', position);
        }
        
        activityDiv.style.backgroundColor = categoryColor;
        
        // Add content based on position
        let content = '';
        if (position === 'start' || position === 'single') {
            content = `
                <div class="activity-content">
                    <div class="title">${activity.title}</div>
                    ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
                    ${activity.is_recurring ? '<i class="bi bi-arrow-repeat ms-1" title="Activité récurrente"></i>' : ''}
                </div>
            `;
        } else if (position === 'middle') {
            content = '<div class="activity-content"></div>';
        } else if (position === 'end') {
            content = '<div class="activity-content"></div>';
        }
        
        activityDiv.innerHTML = content;
        activityDiv.addEventListener('click', () => showActivityDetails(activity));
        
        // Calculate and set the width for multi-day events
        if (position !== 'single') {
            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const remainingDays = Math.ceil((endDate - new Date(date)) / (1000 * 60 * 60 * 24)) + 1;
            const width = position === 'start' ? totalDays : remainingDays;
            activityDiv.style.width = `calc(${width * 100}% + ${width - 1}px)`;
        }
        
        return activityDiv;
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
            
            // Sort activities by duration (longest first) to handle overlapping
            activities.sort((a, b) => {
                const aDuration = a.end_date ? (new Date(a.end_date) - new Date(a.date)) : 0;
                const bDuration = b.end_date ? (new Date(b.end_date) - new Date(b.date)) : 0;
                return bDuration - aDuration;
            });
            
            const groupedActivities = groupActivitiesByDate(activities, startDate, endDate);
            
            Object.entries(groupedActivities).forEach(([dateStr, dateActivities]) => {
                const allDayContainer = document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`);
                const timedContainer = document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                
                if (allDayContainer && timedContainer) {
                    dateActivities.allDay.forEach(activity => {
                        if (shouldDisplayActivity(activity)) {
                            const activityElement = createActivityElement(activity, dateStr);
                            allDayContainer.appendChild(activityElement);
                        }
                    });
                    
                    dateActivities.timed.forEach(activity => {
                        if (shouldDisplayActivity(activity)) {
                            const activityElement = createActivityElement(activity, dateStr);
                            timedContainer.appendChild(activityElement);
                        }
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
                
                const array = activity.is_all_day ? grouped[dateStr].allDay : grouped[dateStr].timed;
                array.push({
                    ...activity,
                    displayDate: new Date(currentDate)
                });
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });
        
        return grouped;
    }

    function displayActivity(activity) {
        const activityStartDate = new Date(activity.date);
        const activityEndDate = activity.end_date ? new Date(activity.end_date) : activityStartDate;
        const displayDate = activity.displayDate || activityStartDate;
        const dateStr = displayDate.toISOString().split('T')[0];
        
        // Only display multi-day activities on their start date
        if (activityEndDate > activityStartDate && displayDate > activityStartDate) {
            return; // Skip duplicate displays
        }
        
        const container = activity.is_all_day ?
            document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
            document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
        
        if (container) {
            const activityElement = createActivityElement(activity, 'multi-day');
            
            if (activityEndDate > activityStartDate) {
                const days = Math.ceil((activityEndDate - activityStartDate) / (1000 * 60 * 60 * 24)) + 1;
                activityElement.style.width = `calc(${days * 100}% + ${days}px)`;
                // Set z-index inversely proportional to duration - longer events go behind
                const duration = activityEndDate - activityStartDate;
                activityElement.style.zIndex = Math.max(1, 100 - Math.floor(duration / (1000 * 60 * 60 * 24)));
            }
            
            container.appendChild(activityElement);
        }
    }

    function showActivityDetails(activity) {
        const modalHTML = `
            <div class="modal fade" id="activityDetailsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title text-white">${activity.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-white">
                            <div class="mb-2 text-white">
                                <strong class="text-white">Date:</strong> ${activity.date}
                                ${activity.end_date ? `- ${activity.end_date}` : ''}
                            </div>
                            ${!activity.is_all_day ? `
                                <div class="mb-2 text-white">
                                    <strong class="text-white">Heure:</strong> ${activity.time || ''}
                                    ${activity.end_time ? ` - ${activity.end_time}` : ''}
                                </div>
                            ` : ''}
                            ${activity.location ? `
                                <div class="mb-2 text-white">
                                    <strong class="text-white">Lieu:</strong> ${activity.location}
                                </div>
                            ` : ''}
                            ${activity.categories.length > 0 ? `
                                <div class="mb-2 text-white">
                                    <strong class="text-white">Catégories:</strong> ${activity.categories.map(c => c.name).join(', ')}
                                </div>
                            ` : ''}
                            ${activity.notes ? `
                                <div class="mb-2 text-white">
                                    <strong class="text-white">Notes:</strong><br>
                                    ${activity.notes}
                                </div>
                            ` : ''}
                            ${activity.is_recurring ? `
                                <div class="mb-2 text-white">
                                    <strong class="text-white">Récurrence:</strong> ${
                                        activity.recurrence_type === 'daily' ? 'Quotidien' :
                                        activity.recurrence_type === 'weekly' ? 'Hebdomadaire' :
                                        activity.recurrence_type === 'monthly' ? 'Mensuel' :
                                        'Annuel'
                                    }
                                    (jusqu'au ${activity.recurrence_end_date})
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('activityDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = new bootstrap.Modal(document.getElementById('activityDetailsModal'));
        modal.show();
    }

    // Add navigation event listeners
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    // Initial calendar render
    updateCalendar();
});