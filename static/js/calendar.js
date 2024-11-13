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
            </div>
        `;
        
        element.style.opacity = '0';
        element.style.transform = 'translateY(10px)';
        
        const calculateHeight = () => {
            const content = element.querySelector('.activity-content');
            if (!content) return 0;
            
            const contentHeight = content.scrollHeight;
            const minHeight = parseInt(getComputedStyle(document.documentElement)
                .getPropertyValue('--min-activity-height'));
            const padding = parseInt(getComputedStyle(document.documentElement)
                .getPropertyValue('--activity-padding')) * 2;
            
            return Math.max(minHeight, contentHeight + padding);
        };
        
        requestAnimationFrame(() => {
            const finalHeight = calculateHeight();
            element.setAttribute('data-content-height', finalHeight);
            
            element.offsetHeight;
            
            element.style.height = `${finalHeight}px`;
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
        
        element.addEventListener('click', () => showActivityDetails(activity));
        return element;
    }

    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            if (!response.ok) {
                throw new Error('Failed to load activities');
            }
            const activities = await response.json();
            
            document.querySelectorAll('.all-day-activities, .timed-activities')
                .forEach(container => {
                    container.innerHTML = '';
                    container.style.height = 'auto';
                });
            
            activities.sort((a, b) => {
                const aDuration = a.end_date ? 
                    (new Date(a.end_date) - new Date(a.date)) : 0;
                const bDuration = b.end_date ? 
                    (new Date(b.end_date) - new Date(b.date)) : 0;
                return bDuration - aDuration || new Date(a.date) - new Date(b.date);
            });
            
            const multiDayActivities = new Map();
            const singleDayActivities = [];
            
            activities.forEach(activity => {
                if (!shouldDisplayActivity(activity)) return;
                
                const startDate = new Date(activity.date);
                const endDate = activity.end_date ? new Date(activity.end_date) : startDate;
                
                if (startDate < endDate) {
                    multiDayActivities.set(activity.id, {
                        activity,
                        elements: [],
                        startDate,
                        endDate
                    });
                } else {
                    singleDayActivities.push(activity);
                }
            });
            
            for (const [_, eventData] of multiDayActivities) {
                const { activity, startDate, endDate } = eventData;
                let current = new Date(startDate);
                
                while (current <= endDate) {
                    const dateStr = current.toISOString().split('T')[0];
                    const container = activity.is_all_day ? 
                        document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                        document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                    
                    if (container) {
                        const element = createActivityElement(activity, dateStr, startDate, endDate);
                        container.appendChild(element);
                        eventData.elements.push(element);
                    }
                    current.setDate(current.getDate() + 1);
                }
            }
            
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
            
            requestAnimationFrame(() => {
                multiDayActivities.forEach(({ elements }) => {
                    if (elements.length > 0) {
                        const maxHeight = Math.max(...elements.map(el => 
                            parseInt(el.getAttribute('data-content-height')) || 0
                        ));
                        
                        elements.forEach(element => {
                            element.style.height = `${maxHeight}px`;
                        });
                    }
                });
                
                document.querySelectorAll('.all-day-activities').forEach(container => {
                    if (container.children.length > 0) {
                        const totalHeight = Array.from(container.children)
                            .reduce((acc, child) => acc + child.offsetHeight + 2, 8);
                        container.style.height = `${totalHeight}px`;
                    }
                });
            });
            
        } catch (error) {
            console.error('Error loading activities:', error);
            // Show error message to user
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.textContent = 'Failed to load activities. Please try again later.';
            document.querySelector('.calendar-container').prepend(errorDiv);
        }
    }

    async function showActivityDetails(activity) {
        try {
            const response = await fetch(`/api/activities/${activity.id}`);
            const details = await response.json();
            
            // Display activity details in modal
            const modal = document.getElementById('activityDetailsModal');
            modal.querySelector('.modal-body').innerHTML = `
                <div class="activity-details">
                    <h5>${details.title}</h5>
                    <p>Date: ${new Date(details.date).toLocaleDateString('fr-FR')}</p>
                    ${details.location ? `<p>Location: ${details.location}</p>` : ''}
                    ${details.notes ? `<p>Notes: ${details.notes}</p>` : ''}
                    ${details.is_recurring ? '<p><i class="bi bi-arrow-repeat"></i> Recurring event</p>' : ''}
                    ${details.categories ? `
                        <div class="d-flex flex-wrap gap-1 mt-2">
                            ${details.categories.map(c => `
                                <span class="badge" style="background-color: ${c.color}">${c.name}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
            new bootstrap.Modal(modal).show();
        } catch (error) {
            console.error('Error loading activity details:', error);
        }
    }
});