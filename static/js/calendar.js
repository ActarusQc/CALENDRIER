let currentDate = new Date();

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Create calendar grid first
        updateCalendar();
        
        // Wait for grid to be fully rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Load activities first since they don't require authentication
        await loadActivities(currentDate.getFullYear(), currentDate.getMonth());
        
        // Only try to load locations and categories if user is authenticated
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
    try {
        if (!window.userCanManageActivities) {
            return;
        }

        const [locationsResponse, categoriesResponse] = await Promise.all([
            fetch('/api/locations'),
            fetch('/api/categories')
        ]);
        
        if (!locationsResponse.ok || !categoriesResponse.ok) {
            // User might not be authenticated, skip silently
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
        console.warn('Error loading locations and categories:', error);
        // Don't show error to users
    }
}

function createActivityElement(activity, position = 'single', top = 0) {
    if (!activity?.title) {
        console.warn('Invalid activity data:', activity);
        return null;
    }
    
    const activityDiv = document.createElement('div');
    activityDiv.className = 'activity';
    
    try {
        const categoryColor = activity.categories?.[0]?.color || '#6f42c1';
        
        if (activity.end_date && new Date(activity.end_date) > new Date(activity.date)) {
            activityDiv.classList.add('multi-day');
            activityDiv.classList.add(position);
            activityDiv.style.backgroundColor = categoryColor;
            activityDiv.style.top = `${top}px`;
            
            // For multi-day events, always show the title and location
            activityDiv.innerHTML = `
                <div class="activity-content">
                    <div class="title">${activity.title}</div>
                    ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
                </div>
            `;
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
        
        activityDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            showActivityDetails(activity);
        });
        
        return activityDiv;
    } catch (error) {
        console.error('Error creating activity element:', error);
        return null;
    }
}

async function loadActivities(year, month) {
    try {
        // Ensure calendar grid exists
        const calendarGrid = document.getElementById('calendarDates');
        if (!calendarGrid) {
            console.warn('Calendar grid not found, retrying in 100ms');
            await new Promise(resolve => setTimeout(resolve, 100));
            return loadActivities(year, month);
        }

        const response = await fetch('/api/activities');
        if (!response.ok) {
            throw new Error(`Failed to load activities: ${response.statusText}`);
        }

        const activities = await response.json();
        if (!Array.isArray(activities)) {
            console.warn('Invalid activities data received');
            return;
        }

        // Clear existing activities before adding new ones
        const containers = document.querySelectorAll('.all-day-activities, .timed-activities');
        containers.forEach(container => {
            if (container) container.innerHTML = '';
        });
        
        // Sort activities by date
        activities.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Track multi-day event positions to prevent overlapping
        const multiDayEvents = new Map();
        const processedEvents = new Set();
        let multiDayOffset = 0;
        
        activities.forEach(activity => {
            if (!activity?.date) return;
            
            const startDate = new Date(activity.date);
            const endDate = activity.end_date ? new Date(activity.end_date) : startDate;
            
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                if (currentDate.getFullYear() === year && currentDate.getMonth() === month) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const container = document.querySelector(
                        `${activity.is_all_day || endDate > startDate ? '.all-day-activities' : '.timed-activities'}[data-date="${dateStr}"]`
                    );
                    
                    if (container && !processedEvents.has(activity.id + dateStr)) {
                        let position = 'single';
                        let top = 0;
                        
                        if (endDate > startDate) {
                            position = currentDate.getTime() === startDate.getTime() ? 'start' :
                                     currentDate.getTime() === endDate.getTime() ? 'end' : 'middle';
                            
                            // Calculate vertical position for multi-day events
                            if (!multiDayEvents.has(activity.id)) {
                                multiDayEvents.set(activity.id, multiDayOffset);
                                multiDayOffset += 30; // Height of multi-day event + spacing
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
        // Don't show error alert to users, just log it
    }
}

function createDateCell(date) {
    const cell = document.createElement('div');
    cell.className = 'calendar-date';
    
    if (date) {
        const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
        
        const dateDiv = document.createElement('div');
        dateDiv.className = 'date-number';
        dateDiv.textContent = date;
        cell.appendChild(dateDiv);
        
        const allDayDiv = document.createElement('div');
        allDayDiv.className = 'all-day-activities';
        allDayDiv.setAttribute('data-date', formattedDate);
        cell.appendChild(allDayDiv);
        
        const activitiesDiv = document.createElement('div');
        activitiesDiv.className = 'timed-activities';
        activitiesDiv.setAttribute('data-date', formattedDate);
        cell.appendChild(activitiesDiv);
        
        if (window.userCanManageActivities) {
            const quickAddBtn = document.createElement('button');
            quickAddBtn.className = 'quick-add-btn';
            quickAddBtn.innerHTML = '+';
            quickAddBtn.onclick = (e) => {
                e.stopPropagation();
                openQuickAddModal(formattedDate);
            };
            cell.appendChild(quickAddBtn);
        }
    }
    
    return cell;
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
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
        calendarDates.appendChild(createDateCell());
    }
    
    // Add cells for each day of the month
    for (let date = 1; date <= lastDay.getDate(); date++) {
        calendarDates.appendChild(createDateCell(date));
    }
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
        
        const form = document.getElementById('activityForm');
        if (form) form.reset();
        
        const dateInput = document.getElementById('date');
        if (dateInput) dateInput.value = date;
        
        // Reset all form fields
        ['activityId', 'title', 'notes', 'end_date'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });
        
        const allDayCheck = document.getElementById('is_all_day');
        if (allDayCheck) allDayCheck.checked = false;
        
        ['time', 'end_time'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });
        
        const modalElement = document.getElementById('activityModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    } catch (error) {
        console.error('Error opening quick add modal:', error);
    }
}

// Month navigation event listeners
document.getElementById('prevMonth')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
    loadActivities(currentDate.getFullYear(), currentDate.getMonth());
});

document.getElementById('nextMonth')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
    loadActivities(currentDate.getFullYear(), currentDate.getMonth());
});
