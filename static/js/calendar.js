document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    
    loadActivities();
    if (window.userCanManageActivities) {
        setupForm();
    }

    function setupForm() {
        const allDayCheckbox = document.getElementById('is_all_day');
        const timeField = document.getElementById('timeField');
        const endTimeField = document.getElementById('endTimeField');
        
        if (allDayCheckbox && timeField && endTimeField) {
            // Set initial state
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
    }
    
    async function loadLocationsAndCategories() {
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
            
            // Populate location dropdown
            const locationSelect = document.getElementById('location');
            locationSelect.innerHTML = `<option value="">${window.translations.select_location || 'Select location'}</option>`;
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = location.name;
                locationSelect.appendChild(option);
            });
            
            // Populate categories checkboxes
            const categoriesContainer = document.getElementById('categoriesContainer');
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
        } catch (error) {
            console.error('Error loading locations and categories:', error);
            alert('Error loading data');
        }
    }

    async function saveActivity() {
        try {
            const activity = {
                title: document.getElementById('title').value.trim(),
                date: document.getElementById('date').value,
                is_all_day: document.getElementById('is_all_day')?.checked || false,
                time: document.getElementById('is_all_day')?.checked ? null : document.getElementById('time').value,
                end_date: document.getElementById('end_date').value || null,
                end_time: document.getElementById('is_all_day')?.checked ? null : document.getElementById('end_time').value,
                location_id: document.getElementById('location').value || null,
                category_ids: Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => parseInt(cb.value)),
                notes: document.getElementById('notes').value.trim()
            };

            if (!activity.title || !activity.date) {
                alert('Please fill in all required fields');
                return;
            }

            // Add validation for end date
            if (activity.end_date && activity.date > activity.end_date) {
                alert('End date cannot be before start date');
                return;
            }

            const activityId = document.getElementById('activityId').value;
            const url = activityId ? `/api/activities/${activityId}` : '/api/activities';
            const method = activityId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(activity)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save activity');
            }

            const modal = bootstrap.Modal.getInstance(document.getElementById('activityModal'));
            modal.hide();
            await loadActivities();
        } catch (error) {
            console.error('Error saving activity:', error);
            alert('Error saving activity: ' + error.message);
        }
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
        
        // Add empty cells for days before the first of the month
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarDates.appendChild(createDateCell());
        }
        
        // Add cells for each day of the month
        for (let date = 1; date <= lastDay.getDate(); date++) {
            calendarDates.appendChild(createDateCell(date));
        }
        
        fetchActivities(year, month);
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
                const addButton = document.createElement('button');
                addButton.className = 'add-activity-btn';
                addButton.innerHTML = '+';
                addButton.title = 'Add activity';
                
                addButton.addEventListener('click', async () => {
                    // Reset form and load data before showing modal
                    document.getElementById('activityId').value = '';
                    document.getElementById('title').value = '';
                    document.getElementById('date').value = formattedDate;
                    document.getElementById('end_date').value = '';
                    document.getElementById('is_all_day').checked = false;
                    document.getElementById('time').value = '';
                    document.getElementById('end_time').value = '';
                    document.getElementById('notes').value = '';
                    
                    await loadLocationsAndCategories();
                    const modal = new bootstrap.Modal(document.getElementById('activityModal'));
                    modal.show();
                });
                
                cell.appendChild(addButton);
            }
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
                        ${!activity.is_all_day && activity.time ? 
                            `<span class="time">${activity.time}${activity.end_time ? ' - ' + activity.end_time : ''}</span>` : 
                            ''}
                        ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
                    </div>
                `;
            } else {
                activityDiv.innerHTML = `<div class="activity-content"><div class="title">${activity.title}</div></div>`;
            }
            
            activityDiv.title = `${activity.title}${activity.location ? ' - ' + activity.location : ''}`;
        } else {
            activityDiv.style.backgroundColor = categoryColor;
            activityDiv.innerHTML = `
                <div class="activity-content">
                    ${!activity.is_all_day && activity.time ? 
                        `<span class="time">${activity.time}${activity.end_time ? ' - ' + activity.end_time : ''}</span>` : 
                        ''}
                    <div class="title">${activity.title}</div>
                    ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
                </div>
            `;
        }
        
        activityDiv.addEventListener('click', () => showActivityDetails(activity));
        
        return activityDiv;
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
    
    async function fetchActivities(year, month) {
        try {
            const response = await fetch('/api/activities');
            const activities = await response.json();
            
            activities.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA - dateB;
                }
                return (a.time || '').localeCompare(b.time || '');
            });
            
            document.querySelectorAll('.all-day-activities').forEach(container => container.innerHTML = '');
            document.querySelectorAll('.timed-activities').forEach(container => container.innerHTML = '');
            
            const multiDayActivities = activities.filter(activity => activity.end_date);
            const singleDayActivities = activities.filter(activity => !activity.end_date);
            
            multiDayActivities.forEach(activity => {
                const startDate = new Date(activity.date);
                const endDate = new Date(activity.end_date);
                
                let currentDate = new Date(startDate);
                while (currentDate <= endDate) {
                    if (currentDate.getFullYear() === year && currentDate.getMonth() === month) {
                        const dateStr = currentDate.toISOString().split('T')[0];
                        const container = activity.is_all_day ?
                            document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                            document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                        
                        if (container) {
                            let position = 'middle';
                            if (currentDate.getTime() === startDate.getTime()) {
                                position = 'start';
                            } else if (currentDate.getTime() === endDate.getTime()) {
                                position = 'end';
                            }
                            
                            const activityElement = createActivityElement(activity, position);
                            container.appendChild(activityElement);
                        }
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });
            
            singleDayActivities.forEach(activity => {
                const activityDate = new Date(activity.date);
                if (activityDate.getFullYear() === year && activityDate.getMonth() === month) {
                    const dateStr = activityDate.toISOString().split('T')[0];
                    const container = activity.is_all_day ?
                        document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                        document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);
                    
                    if (container) {
                        const activityElement = createActivityElement(activity, 'single');
                        container.appendChild(activityElement);
                    }
                }
            });
        } catch (error) {
            console.error('Error loading activities:', error);
        }
    }
    
    // Event handlers for month navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    // Add form submit handler
    const activityForm = document.getElementById('activityForm');
    if (activityForm) {
        activityForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveActivity();
        });
    }
    
    updateCalendar();
});
