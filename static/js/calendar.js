let currentDate = new Date();

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initializeForm();
        updateCalendar();
    } catch (error) {
        console.error('Error initializing calendar:', error);
    }
});

async function initializeForm() {
    try {
        if (window.userCanManageActivities) {
            await loadLocationsAndCategories();
            setupForm();
        }
    } catch (error) {
        console.error('Error initializing form:', error);
    }
}

function setupForm() {
    const allDayCheckbox = document.getElementById('is_all_day');
    const timeField = document.getElementById('timeField');
    const endTimeField = document.getElementById('endTimeField');
    
    if (!allDayCheckbox || !timeField || !endTimeField) {
        return;
    }
    
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
            fetch('/api/locations'),
            fetch('/api/categories')
        ]);
        
        if (!locationsResponse.ok || !categoriesResponse.ok) {
            throw new Error('Failed to load data');
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
                        <span class="color-dot" style="background-color: ${category.color}; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 8px;"></span>
                        ${category.name}
                    </label>
                `;
                categoriesContainer.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Error loading locations and categories:', error);
    }
}

function createActivityElement(activity, position, top = 0) {
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
        activityDiv.style.top = `${top}px`;
        
        // Always show content for better visibility
        activityDiv.innerHTML = `
            <div class="activity-content">
                <div class="title">${activity.title}</div>
                ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
            </div>
        `;
        
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
    
    activityDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        showActivityDetails(activity);
    });
    
    return activityDiv;
}

async function openQuickAddModal(date) {
    try {
        if (!window.userCanManageActivities) return;
        
        await initializeForm();
        document.getElementById('date').value = date;
        document.getElementById('activityId').value = '';
        document.getElementById('title').value = '';
        document.getElementById('notes').value = '';
        document.getElementById('is_all_day').checked = false;
        document.getElementById('time').value = '';
        document.getElementById('end_time').value = '';
        document.getElementById('end_date').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        modal.show();
    } catch (error) {
        console.error('Error opening modal:', error);
    }
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
    
    document.getElementById('currentMonth').textContent = 
        new Date(year, month).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
        .replace(/^./, str => str.toUpperCase());
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const calendarDates = document.getElementById('calendarDates');
    calendarDates.innerHTML = '';
    
    for (let i = 0; i < firstDay.getDay(); i++) {
        calendarDates.appendChild(createDateCell());
    }
    
    for (let date = 1; date <= lastDay.getDate(); date++) {
        calendarDates.appendChild(createDateCell(date));
    }
    
    loadActivities(year, month);
}

async function loadActivities(year, month) {
    try {
        const response = await fetch('/api/activities');
        if (!response.ok) {
            throw new Error('Failed to load activities');
        }
        const activities = await response.json();
        
        activities.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA - dateB;
            }
            return (a.time || '').localeCompare(b.time || '');
        });
        
        const multiDayEvents = new Map(); // Track vertical position of multi-day events
        const processedEvents = new Set();
        
        activities.forEach(activity => {
            const activityDate = new Date(activity.date);
            const endDate = activity.end_date ? new Date(activity.end_date) : activityDate;
            
            let currentDateInRange = new Date(activityDate);
            while (currentDateInRange <= endDate) {
                if (currentDateInRange.getFullYear() === year && currentDateInRange.getMonth() === month) {
                    const dateStr = currentDateInRange.toISOString().split('T')[0];
                    const container = activity.is_all_day ?
                        document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                        document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                    
                    if (container && !processedEvents.has(activity.id + dateStr)) {
                        let position = 'single';
                        if (endDate > activityDate) {
                            if (currentDateInRange.getTime() === activityDate.getTime()) {
                                position = 'start';
                            } else if (currentDateInRange.getTime() === endDate.getTime()) {
                                position = 'end';
                            } else {
                                position = 'middle';
                            }
                        }
                        
                        // Calculate vertical position for multi-day events
                        let top = 0;
                        if (endDate > activityDate) {
                            if (!multiDayEvents.has(activity.id)) {
                                multiDayEvents.set(activity.id, (multiDayEvents.size * 30));
                            }
                            top = multiDayEvents.get(activity.id);
                        }
                        
                        const activityElement = createActivityElement(activity, position, top);
                        container.appendChild(activityElement);
                        processedEvents.add(activity.id + dateStr);
                    }
                }
                currentDateInRange.setDate(currentDateInRange.getDate() + 1);
            }
        });
    } catch (error) {
        console.error('Error loading activities:', error);
    }
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

document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
});
