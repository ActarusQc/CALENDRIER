let currentDate = new Date();

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // First create calendar grid
        updateCalendar();
        
        // Then load activities
        await loadActivities(currentDate.getFullYear(), currentDate.getMonth());
        
        // Initialize form if user can manage activities
        if (typeof window.userCanManageActivities !== 'undefined' && window.userCanManageActivities) {
            await loadLocationsAndCategories();
            setupForm();
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

function setupForm() {
    const allDayCheckbox = document.getElementById('is_all_day');
    const timeField = document.getElementById('timeField');
    const endTimeField = document.getElementById('endTimeField');
    
    if (!allDayCheckbox || !timeField || !endTimeField) return;
    
    timeField.style.display = allDayCheckbox.checked ? 'none' : 'block';
    endTimeField.style.display = allDayCheckbox.checked ? 'none' : 'block';
    
    allDayCheckbox.addEventListener('change', function() {
        timeField.style.display = this.checked ? 'none' : 'block';
        endTimeField.style.display = this.checked ? 'none' : 'block';
        if (this.checked) {
            document.getElementById('time').value = '';
            document.getElementById('end_time').value = '';
        }
    });
}

async function loadLocationsAndCategories() {
    if (!window.userCanManageActivities) return;
    
    try {
        const [locationsResponse, categoriesResponse] = await Promise.all([
            fetch('/api/locations', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            }),
            fetch('/api/categories', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            })
        ]);

        if (!locationsResponse.ok || !categoriesResponse.ok) {
            console.warn('Authentication required for admin features');
            return;
        }

        const locations = await locationsResponse.json();
        const categories = await categoriesResponse.json();
        
        const locationSelect = document.getElementById('location');
        if (locationSelect) {
            locationSelect.innerHTML = '<option value="">Select location</option>';
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = location.name;
                locationSelect.appendChild(option);
            });
        }
        
        const categoriesContainer = document.getElementById('categoriesContainer');
        if (categoriesContainer) {
            categoriesContainer.innerHTML = '';
            categories.forEach(category => {
                const div = document.createElement('div');
                div.className = 'form-check';
                div.innerHTML = `
                    <input class="form-check-input category-checkbox" type="checkbox" 
                        value="${category.id}" id="category${category.id}">
                    <label class="form-check-label text-white" for="category${category.id}">
                        <span class="color-dot" style="background-color: ${category.color}"></span>
                        ${category.name}
                    </label>
                `;
                categoriesContainer.appendChild(div);
            });
        }
    } catch (error) {
        console.warn('Failed to load admin data:', error);
    }
}

async function loadActivities(year, month) {
    try {
        const response = await fetch('/api/activities', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load activities: ${response.status}`);
        }

        const activities = await response.json();
        if (!Array.isArray(activities)) {
            console.warn('Invalid activities data received');
            return;
        }

        // Clear existing activities
        document.querySelectorAll('.all-day-activities, .timed-activities').forEach(container => {
            if (container) container.innerHTML = '';
        });

        // Sort activities by duration (longer events first) and start date
        activities.sort((a, b) => {
            const aStart = new Date(a.date);
            const bStart = new Date(b.date);
            const aEnd = a.end_date ? new Date(a.end_date) : aStart;
            const bEnd = b.end_date ? new Date(b.end_date) : bStart;
            const aDuration = aEnd - aStart;
            const bDuration = bEnd - bStart;
            return bDuration - aDuration || aStart - bStart;
        });

        // Track vertical positions for multi-day events
        const multiDayEvents = new Map();
        const processedEvents = new Set();
        let multiDayOffset = 0;

        activities.forEach(activity => {
            if (!activity?.date) return;
            
            const startDate = new Date(activity.date);
            const endDate = activity.end_date ? new Date(activity.end_date) : startDate;
            const isMultiDay = endDate > startDate;
            
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                if (currentDate.getFullYear() === year && currentDate.getMonth() === month) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const container = document.querySelector(
                        `${activity.is_all_day || isMultiDay ? '.all-day-activities' : '.timed-activities'}[data-date="${dateStr}"]`
                    );
                    
                    if (container && !processedEvents.has(activity.id + dateStr)) {
                        let position = isMultiDay
                            ? currentDate.getTime() === startDate.getTime()
                                ? 'start'
                                : currentDate.getTime() === endDate.getTime()
                                    ? 'end'
                                    : 'middle'
                            : 'single';
                        
                        let top = 0;
                        if (isMultiDay) {
                            if (!multiDayEvents.has(activity.id)) {
                                multiDayEvents.set(activity.id, multiDayOffset);
                                multiDayOffset += 32; // Height of event + margin
                            }
                            top = multiDayEvents.get(activity.id);
                        }
                        
                        const element = createActivityElement(activity, position, top);
                        if (element) {
                            container.appendChild(element);
                            processedEvents.add(activity.id + dateStr);
                        }
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

function createActivityElement(activity, position = 'single', top = 0) {
    if (!activity?.title) return null;
    
    const activityDiv = document.createElement('div');
    activityDiv.className = 'activity';
    
    const categoryColor = activity.categories?.[0]?.color || '#6f42c1';
    activityDiv.style.backgroundColor = categoryColor;
    
    if (position !== 'single') {
        activityDiv.classList.add('multi-day', position);
        activityDiv.style.top = `${top}px`;
    }
    
    activityDiv.innerHTML = `
        <div class="activity-content">
            ${!activity.is_all_day && activity.time ? `<span class="time">${activity.time}</span>` : ''}
            <div class="title">${activity.title}</div>
            ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
        </div>
    `;
    
    if (window.userCanManageActivities) {
        activityDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            showActivityDetails(activity);
        });
    }
    
    return activityDiv;
}

function updateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthElement = document.getElementById('currentMonth');
    if (monthElement) {
        monthElement.textContent = new Date(year, month)
            .toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
            .replace(/^./, str => str.toUpperCase());
    }
    
    const calendarDates = document.getElementById('calendarDates');
    if (!calendarDates) return;
    
    calendarDates.innerHTML = '';
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    for (let i = 0; i < firstDay.getDay(); i++) {
        calendarDates.appendChild(createDateCell());
    }
    
    for (let date = 1; date <= lastDay.getDate(); date++) {
        calendarDates.appendChild(createDateCell(date));
    }
}

function createDateCell(date) {
    const cell = document.createElement('div');
    cell.className = 'calendar-date';
    
    if (date) {
        const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
        
        cell.innerHTML = `
            <div class="date-number">${date}</div>
            <div class="all-day-activities" data-date="${formattedDate}"></div>
            <div class="timed-activities" data-date="${formattedDate}"></div>
            ${window.userCanManageActivities ? `<button class="quick-add-btn" onclick="openQuickAddModal('${formattedDate}')">+</button>` : ''}
        `;
    }
    
    return cell;
}

function showActivityDetails(activity) {
    if (!activity) return;
    
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
                    <p><strong>Categories:</strong> ${activity.categories ? activity.categories.map(c => c.name).join(', ') : 'None'}</p>
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

async function openQuickAddModal(date) {
    if (!window.userCanManageActivities) return;
    
    try {
        await loadLocationsAndCategories();
        
        document.getElementById('activityId').value = '';
        document.getElementById('title').value = '';
        document.getElementById('date').value = date;
        document.getElementById('end_date').value = '';
        document.getElementById('is_all_day').checked = false;
        document.getElementById('time').value = '';
        document.getElementById('end_time').value = '';
        document.getElementById('notes').value = '';
        
        document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        modal.show();
    } catch (error) {
        console.error('Error opening quick add modal:', error);
    }
}

// Navigation event handlers
document.getElementById('prevMonth')?.addEventListener('click', async () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
    await loadActivities(currentDate.getFullYear(), currentDate.getMonth());
});

document.getElementById('nextMonth')?.addEventListener('click', async () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
    await loadActivities(currentDate.getFullYear(), currentDate.getMonth());
});
