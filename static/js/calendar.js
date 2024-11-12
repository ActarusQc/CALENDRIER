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
        }
    }

    function toggleCategoryFilter(categoryId) {
        const button = document.querySelector(`[data-category="${categoryId}"]`);
        if (!button) return;

        if (activeCategories.has('all')) {
            activeCategories.clear();
            document.querySelector('.show-all-btn').classList.remove('active');
            activeCategories.add(categoryId.toString());
            button.classList.add('active');
        } else if (activeCategories.has(categoryId.toString())) {
            activeCategories.delete(categoryId.toString());
            button.classList.remove('active');
            if (activeCategories.size === 0) {
                resetCategoryFilters();
                return;
            }
        } else {
            activeCategories.add(categoryId.toString());
            button.classList.add('active');
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
        if (!activity.categories?.length) return false;
        return activity.categories.some(category => activeCategories.has(category.id.toString()));
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

    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            
            // Clear existing activities
            document.querySelectorAll('.all-day-activities, .timed-activities')
                .forEach(container => {
                    container.innerHTML = '';
                    if (container.classList.contains('all-day-activities')) {
                        container.style.height = 'auto';
                    }
                });

            // Sort activities by duration (longest first) and start date
            activities.sort((a, b) => {
                const aDuration = a.end_date ? 
                    (new Date(a.end_date) - new Date(a.date)) : 0;
                const bDuration = b.end_date ? 
                    (new Date(b.end_date) - new Date(b.date)) : 0;
                return bDuration - aDuration;
            });

            // Process activities in two passes
            const multiDayActivities = new Map();
            const singleDayActivities = [];

            // First pass: Group activities
            activities.forEach(activity => {
                if (!shouldDisplayActivity(activity)) return;

                const startDate = new Date(activity.date);
                const endDate = activity.end_date ? new Date(activity.end_date) : startDate;

                if (startDate < endDate) {
                    multiDayActivities.set(activity.id, {
                        activity,
                        elements: [],
                        firstDayHeight: 0
                    });
                } else {
                    singleDayActivities.push(activity);
                }
            });

            // Second pass: Render multi-day events first
            multiDayActivities.forEach((eventData, activityId) => {
                const { activity } = eventData;
                const startDate = new Date(activity.date);
                const endDate = new Date(activity.end_date);
                let current = new Date(startDate);

                while (current <= endDate) {
                    const dateStr = current.toISOString().split('T')[0];
                    const container = activity.is_all_day ? 
                        document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                        document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);

                    if (container) {
                        const element = createActivityElement(
                            activity,
                            dateStr,
                            startDate,
                            endDate
                        );
                        container.appendChild(element);
                        eventData.elements.push(element);
                    }
                    current.setDate(current.getDate() + 1);
                }
            });

            // Third pass: Render single-day events
            singleDayActivities.forEach(activity => {
                const dateStr = activity.date;
                const container = activity.is_all_day ? 
                    document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                    document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);

                if (container) {
                    const element = createActivityElement(
                        activity,
                        dateStr,
                        new Date(activity.date),
                        new Date(activity.date)
                    );
                    container.appendChild(element);
                }
            });

            // Final pass: Normalize heights for multi-day events
            requestAnimationFrame(() => {
                multiDayActivities.forEach((eventData) => {
                    const { elements } = eventData;
                    if (elements.length > 0) {
                        // Calculate the height needed for the first day (with location)
                        const firstElement = elements[0];
                        firstElement.style.height = 'auto';
                        const firstDayHeight = firstElement.getBoundingClientRect().height;

                        // Apply this height to all segments
                        elements.forEach(element => {
                            element.style.height = `${firstDayHeight}px`;
                        });

                        // Update container heights if needed
                        elements.forEach(element => {
                            const container = element.closest('.all-day-activities');
                            if (container) {
                                const currentHeight = parseInt(container.style.height) || 0;
                                const newHeight = element.offsetTop + firstDayHeight + 8; // 8px for padding
                                container.style.height = `${Math.max(currentHeight, newHeight)}px`;
                            }
                        });
                    }
                });
            });

        } catch (error) {
            console.error('Error fetching activities:', error);
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
        
        if (startDate < endDate) {
            const currentDate = new Date(dateStr);
            const isStart = startDate.toDateString() === currentDate.toDateString();
            const isEnd = endDate.toDateString() === currentDate.toDateString();
            
            element.classList.add('multi-day');
            if (isStart) {
                element.classList.add('start');
                element.setAttribute('data-start-date', startDate.toISOString());
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
            </div>
        `;
        
        element.addEventListener('click', () => showActivityDetails(activity));
        return element;
    }

    function showActivityDetails(activity) {
        window.location.href = `/admin?selected_date=${activity.date}`;
    }
});