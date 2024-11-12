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
            
            // Add "Show All" button in French
            const showAllBtn = document.createElement('button');
            showAllBtn.className = 'btn show-all-btn active';
            showAllBtn.textContent = 'Tout afficher';
            showAllBtn.addEventListener('click', resetCategoryFilters);
            filterContainer.appendChild(showAllBtn);
            
            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = 'btn category-btn me-2';
                button.setAttribute('data-category', category.id);
                button.style.backgroundColor = category.color;
                button.textContent = category.name;
                button.addEventListener('click', () => toggleCategoryFilter(category.id));
                filterContainer.appendChild(button);
            });
        } catch (error) {
            console.error('Error loading category filters:', error);
        }
    }

    function toggleCategoryFilter(categoryId) {
        const button = document.querySelector(`[data-category="${categoryId}"]`);
        if (!button) return;

        // If 'Show All' is active, deactivate it first
        if (activeCategories.has('all')) {
            activeCategories.clear();
            document.querySelector('.show-all-btn').classList.remove('active');
        }

        // Toggle category
        if (activeCategories.has(categoryId.toString())) {
            activeCategories.delete(categoryId.toString());
            button.classList.remove('active');
            
            // If no categories are selected, reset to show all
            if (activeCategories.size === 0) {
                resetCategoryFilters();
                return;
            }
        } else {
            activeCategories.add(categoryId.toString());
            button.classList.add('active');
        }

        // Refresh calendar with updated filters
        fetchActivities(currentDate.getFullYear(), currentDate.getMonth());
    }

    function resetCategoryFilters() {
        activeCategories.clear();
        activeCategories.add('all');
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.show-all-btn').classList.add('active');
        fetchActivities(currentDate.getFullYear(), currentDate.getMonth());
    }

    function shouldDisplayActivity(activity) {
        // Always show if "Show All" is active
        if (activeCategories.has('all')) return true;
        
        // Don't show activities without categories when filtering
        if (!activity.categories || activity.categories.length === 0) return false;
        
        // Show if activity has at least one category that matches active filters
        return activity.categories.some(category => 
            activeCategories.has(category.id.toString())
        );
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
        
        // Set initial state
        element.style.opacity = '0';
        element.style.transform = 'translateY(10px)';
        
        // Calculate final height including all content
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
        
        // Apply transitions after a short delay to ensure content is rendered
        requestAnimationFrame(() => {
            const finalHeight = calculateHeight();
            element.setAttribute('data-content-height', finalHeight);
            
            // Force reflow
            element.offsetHeight;
            
            // Apply transitions
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
            const activities = await response.json();
            
            // Clear existing activities
            document.querySelectorAll('.all-day-activities, .timed-activities')
                .forEach(container => {
                    container.innerHTML = '';
                    container.style.height = 'auto';
                });
            
            // Sort activities by duration (longest first) and start date
            activities.sort((a, b) => {
                const aDuration = a.end_date ? 
                    (new Date(a.end_date) - new Date(a.date)) : 0;
                const bDuration = b.end_date ? 
                    (new Date(b.end_date) - new Date(b.date)) : 0;
                return bDuration - aDuration || new Date(a.date) - new Date(b.date);
            });
            
            // Group activities
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
            
            // Render multi-day events first
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
            
            // Render single-day events
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
            
            // Apply consistent heights and transitions to multi-day events
            requestAnimationFrame(() => {
                multiDayActivities.forEach(({ elements }) => {
                    if (elements.length > 0) {
                        // Find the maximum height among all segments
                        const maxHeight = Math.max(...elements.map(el => 
                            parseInt(el.getAttribute('data-content-height')) || 0
                        ));
                        
                        // Apply the maximum height to all segments with transition
                        elements.forEach(element => {
                            element.style.height = `${maxHeight}px`;
                        });
                    }
                });
            });
        } catch (error) {
            console.error('Error loading activities:', error);
        }
    }

    function showActivityDetails(activity) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('activityDetailsModal');
        if (!modal) {
            const modalHTML = `
                <div class="modal fade" id="activityDetailsModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title"></h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="activity-details"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('activityDetailsModal');
        }

        // Update modal content
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.activity-details');
        
        modalTitle.textContent = activity.title;
        
        // Format date and time
        const startDate = new Date(activity.date);
        const endDate = activity.end_date ? new Date(activity.end_date) : null;
        
        let dateStr = startDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        if (endDate) {
            dateStr += ` - ${endDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`;
        }
        
        let timeStr = '';
        if (activity.is_all_day) {
            timeStr = 'Toute la journée';
        } else if (activity.time) {
            timeStr = activity.time;
            if (activity.end_time) {
                timeStr += ` - ${activity.end_time}`;
            }
        }

        const categoryStr = activity.categories
            .map(cat => `<span class="badge" style="background-color: ${cat.color}">${cat.name}</span>`)
            .join(' ');

        modalBody.innerHTML = `
            <div class="mb-3">
                <strong>Date:</strong><br>
                ${dateStr}
            </div>
            ${timeStr ? `
                <div class="mb-3">
                    <strong>Horaire:</strong><br>
                    ${timeStr}
                </div>
            ` : ''}
            ${activity.location ? `
                <div class="mb-3">
                    <strong>Lieu:</strong><br>
                    ${activity.location}
                </div>
            ` : ''}
            ${categoryStr ? `
                <div class="mb-3">
                    <strong>Catégories:</strong><br>
                    ${categoryStr}
                </div>
            ` : ''}
            ${activity.notes ? `
                <div class="mb-3">
                    <strong>Notes:</strong><br>
                    ${activity.notes}
                </div>
            ` : ''}
            ${activity.is_recurring ? `
                <div class="mb-3">
                    <strong>Récurrence:</strong><br>
                    <i class="bi bi-arrow-repeat"></i> ${activity.recurrence_type}
                </div>
            ` : ''}
        `;

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
});