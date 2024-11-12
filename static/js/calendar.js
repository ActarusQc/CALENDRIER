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
            filterContainer.innerHTML = ''; // Clear existing filters
            
            // Add single "Show All" button
            const showAllBtn = document.createElement('button');
            showAllBtn.className = 'btn btn-outline-secondary btn-sm me-2';
            showAllBtn.dataset.category = 'all';
            showAllBtn.textContent = window.translations?.show_all || 'Show All';
            showAllBtn.addEventListener('click', () => toggleCategoryFilter('all'));
            
            // Set initial active state
            if (activeCategories.has('all')) {
                showAllBtn.classList.add('active');
            }
            
            filterContainer.appendChild(showAllBtn);
            
            // Add category buttons
            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = 'btn btn-sm me-2';
                button.dataset.category = category.id.toString();
                button.style.backgroundColor = category.color;
                button.style.color = 'white';
                button.textContent = category.name;
                
                // Set initial active state
                if (activeCategories.has(category.id.toString())) {
                    button.classList.add('active');
                }
                
                button.addEventListener('click', () => toggleCategoryFilter(category.id.toString()));
                filterContainer.appendChild(button);
            });
        } catch (error) {
            console.error('Error loading category filters:', error);
        }
    }

    function toggleCategoryFilter(categoryId) {
        const categoryStr = categoryId.toString();
        const button = document.querySelector(`[data-category="${categoryStr}"]`);
        
        if (!button) return;

        console.log('Before toggle - Active categories:', Array.from(activeCategories));
        
        if (categoryStr === 'all') {
            // Only handle "Show All" if it's not already active
            if (!activeCategories.has('all')) {
                activeCategories.clear();
                activeCategories.add('all');
                
                // Update button states
                document.querySelectorAll('[data-category]').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.category === 'all') {
                        btn.classList.add('active');
                    }
                });
            }
        } else {
            // Handle specific category toggle
            if (activeCategories.has('all')) {
                // If "Show All" is active, clear it and add the clicked category
                activeCategories.clear();
                activeCategories.add(categoryStr);
                document.querySelector('[data-category="all"]').classList.remove('active');
                button.classList.add('active');
            } else {
                // Toggle the clicked category while keeping others unchanged
                if (activeCategories.has(categoryStr)) {
                    activeCategories.delete(categoryStr);
                    button.classList.remove('active');
                } else {
                    activeCategories.add(categoryStr);
                    button.classList.add('active');
                }
            }
            
            // If no categories are selected, switch back to "Show All"
            if (activeCategories.size === 0) {
                activeCategories.add('all');
                document.querySelector('[data-category="all"]').classList.add('active');
            }
        }
        
        console.log('After toggle - Active categories:', Array.from(activeCategories));
        
        // Refresh calendar with updated filters
        updateCalendar();
    }

    function shouldDisplayActivity(activity) {
        console.log('-------- Filtering Activity --------');
        console.log('Activity:', activity.title);
        console.log('Active Categories:', Array.from(activeCategories));
        
        // Always show if "Show All" is active
        if (activeCategories.has('all')) {
            console.log('Show All is active - displaying activity');
            return true;
        }
        
        // Handle activities with no categories more leniently
        if (!activity.categories) {
            console.log('Activity has no categories array - showing when no specific filters');
            return activeCategories.size === 0;
        }

        // Ensure categories is an array
        if (!Array.isArray(activity.categories)) {
            console.log('Activity categories is not an array - converting to array');
            activity.categories = [activity.categories];
        }

        // Empty categories array - show when no specific filters
        if (activity.categories.length === 0) {
            console.log('Activity has empty categories array - showing when no specific filters');
            return activeCategories.size === 0;
        }

        // Check if any of the activity's categories match the active filters
        const hasMatchingCategory = activity.categories.some(category => {
            const categoryId = (category.id || category).toString();
            const isMatched = activeCategories.has(categoryId);
            console.log(`Checking category ${categoryId} (${category.name || 'Unknown'}) - Match: ${isMatched}`);
            return isMatched;
        });

        console.log(`Final result for ${activity.title}: ${hasMatchingCategory}`);
        return hasMatchingCategory;
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
                        activity.end_date ? new Date(activity.end_date) : new Date(activity.date)
                    );
                    container.appendChild(element);
                }
            });
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }

    function showActivityDetails(activity) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('activityDetailsModal');
        if (!modal) {
            const modalHTML = `
                <div class="modal fade" id="activityDetailsModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content bg-dark text-white">
                            <div class="modal-header border-secondary">
                                <h5 class="modal-title text-white"></h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="activity-details"></div>
                            </div>
                            <div class="modal-footer border-secondary">
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
                <strong class="text-white">Date:</strong><br>
                ${dateStr}
            </div>
            ${timeStr ? `
                <div class="mb-3">
                    <strong class="text-white">Horaire:</strong><br>
                    ${timeStr}
                </div>
            ` : ''}
            ${activity.location ? `
                <div class="mb-3">
                    <strong class="text-white">Lieu:</strong><br>
                    ${activity.location}
                </div>
            ` : ''}
            ${categoryStr ? `
                <div class="mb-3">
                    <strong class="text-white">Catégories:</strong><br>
                    ${categoryStr}
                </div>
            ` : ''}
            ${activity.notes ? `
                <div class="mb-3">
                    <strong class="text-white">Notes:</strong><br>
                    ${activity.notes}
                </div>
            ` : ''}
            ${activity.is_recurring ? `
                <div class="mb-3">
                    <strong class="text-white">Récurrence:</strong><br>
                    <i class="bi bi-arrow-repeat"></i> ${activity.recurrence_type}
                </div>
            ` : ''}
        `;

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
});