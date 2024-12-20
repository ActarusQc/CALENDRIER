// Helper functions
function showError(message) {
    const container = document.querySelector('.calendar-container');
    const existingError = container.querySelector('.alert');
    if (existingError) {
        existingError.remove();
    }
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = message;
    container.insertBefore(errorDiv, container.firstChild);
}

function createActivityElement(activity, dateStr, startDate, endDate) {
    const element = document.createElement('div');
    element.className = 'activity';
    element.setAttribute('data-activity-id', activity.id);
    element.setAttribute('data-category-ids', JSON.stringify(activity.categories.map(c => c.id)));

    const categoryColor = activity.categories?.[0]?.color || '#6f42c1';
    element.style.backgroundColor = categoryColor;

    const currentDate = new Date(dateStr);
    const isStart = startDate.toDateString() === currentDate.toDateString();
    const isEnd = endDate.toDateString() === currentDate.toDateString();
    const isMultiDay = startDate < endDate;

    if (activity.is_all_day) {
        element.classList.add('all-day');
    }

    if (isMultiDay) {
        element.classList.add('multi-day');
        if (isStart) {
            element.classList.add('start');
        } else if (isEnd) {
            element.classList.add('end');
        } else {
            element.classList.add('middle');
        }
    }

    // Create content div
    const contentDiv = document.createElement('div');
    contentDiv.className = 'activity-content';

    // Only show content for single-day events or the first day of multi-day events
    if (!isMultiDay || isStart) {
        // Add time if not all-day event
        if (!activity.is_all_day && activity.time) {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'activity-time';
            timeDiv.textContent = `${activity.time}${activity.end_time ? ' - ' + activity.end_time : ''}`;
            contentDiv.appendChild(timeDiv);
        }

        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        titleDiv.textContent = activity.title;
        contentDiv.appendChild(titleDiv);

        if (activity.location) {
            const locationDiv = document.createElement('div');
            locationDiv.className = 'location';
            locationDiv.textContent = activity.location;
            contentDiv.appendChild(locationDiv);
        }

        if (activity.is_recurring) {
            const icon = document.createElement('i');
            icon.className = 'bi bi-arrow-repeat ms-1';
            contentDiv.appendChild(icon);
        }
    }

    element.appendChild(contentDiv);
    element.addEventListener('click', () => showActivityDetails(activity));
    return element;
}

async function fetchActivities() {
    try {
        const response = await fetch('/api/activities');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const activities = await response.json();

        // Clear existing activities
        document.querySelectorAll('.all-day-activities, .timed-activities').forEach(container => {
            container.innerHTML = '';
        });

        // Sort activities by start date and duration
        activities.sort((a, b) => {
            const startA = new Date(a.date);
            const startB = new Date(b.date);
            if (startA.getTime() !== startB.getTime()) {
                return startA - startB;
            }
            const endA = a.end_date ? new Date(a.end_date) : startA;
            const endB = b.end_date ? new Date(b.end_date) : startB;
            return (endB - startB) - (endA - startA);
        });

        // Process activities
        activities.forEach(activity => {
            if (!shouldDisplayActivity(activity)) return;

            const startDate = new Date(activity.date);
            const endDate = activity.end_date ? new Date(activity.end_date) : startDate;

            // For each day between start and end date
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const container = activity.is_all_day ?
                    document.querySelector(`div.all-day-activities[data-date="${dateStr}"]`) :
                    document.querySelector(`div.timed-activities[data-date="${dateStr}"]`);

                if (container) {
                    const element = createActivityElement(activity, dateStr, startDate, endDate);
                    container.appendChild(element);
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }
        });

        // Uniformiser la hauteur des sections "all-day-activities" par semaine
        uniformizeAllDayHeights();

    } catch (error) {
        console.error('Error:', error);
        showError('Failed to load activities. Please try again later.');
    }
}

function uniformizeAllDayHeights() {
    const allDayContainers = document.querySelectorAll('.all-day-activities');
    const weekMap = new Map();

    // Grouper les conteneurs par semaine
    allDayContainers.forEach(container => {
        const date = new Date(container.dataset.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Début de la semaine (dimanche)
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weekMap.has(weekKey)) {
            weekMap.set(weekKey, []);
        }
        weekMap.get(weekKey).push(container);
    });

    // Pour chaque semaine, trouver la hauteur maximale et l'appliquer à tous les conteneurs
    weekMap.forEach(containers => {
        let maxHeight = 0;

        // Réinitialiser les hauteurs et trouver le maximum
        containers.forEach(container => {
            container.style.height = 'auto';
            const height = container.offsetHeight;
            maxHeight = Math.max(maxHeight, height);
        });

        // Appliquer la hauteur maximale à tous les conteneurs de la semaine
        if (maxHeight > 0) {
            containers.forEach(container => {
                container.style.minHeight = `${maxHeight}px`;
            });
        }
    });
}

function shouldDisplayActivity(activity) {
    const selectedCategories = window.selectedCategories || new Set(['all']);
    if (selectedCategories.has('all')) return true;
    if (!activity.category_ids || activity.category_ids.length === 0) return false;
    return activity.category_ids.some(categoryId => selectedCategories.has(categoryId.toString()));
}


document.addEventListener('DOMContentLoaded', function() {
    let currentDate = new Date();
    let currentView = 'month';
    window.selectedCategories = new Set(['all']);

    updateCalendar();
    loadCategories();

    // Navigation button event listeners
    document.getElementById('prevMonth').addEventListener('click', () => {
        switch (currentView) {
            case 'day':
                currentDate.setDate(currentDate.getDate() - 1);
                break;
            case 'week':
            case 'business-week':
                currentDate.setDate(currentDate.getDate() - 7);
                break;
            default: // month view
                currentDate.setMonth(currentDate.getMonth() - 1);
        }
        updateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        switch (currentView) {
            case 'day':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'week':
            case 'business-week':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            default: // month view
                currentDate.setMonth(currentDate.getMonth() + 1);
        }
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

    async function loadCategories() {
        try {
            const response = await fetch('/api/categories');
            const categories = await response.json();
            const categoryFilters = document.getElementById('categoryFilters');

            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = 'btn btn-sm btn-outline-secondary';
                button.setAttribute('data-category', category.id);
                button.innerHTML = `
                    <span class="color-dot" style="background-color: ${category.color}"></span>
                    ${category.name}
                `;
                button.addEventListener('click', () => toggleCategory(category.id));
                categoryFilters.appendChild(button);
            });
        } catch (error) {
            console.error('Error loading categories:', error);
            showError('Failed to load categories');
        }
    }

    async function loadQuickAddFormData() {
        try {
            // Load locations
            const locationsResponse = await fetch('/api/locations');
            const locations = await locationsResponse.json();
            const locationSelect = document.getElementById('quickAddLocation');
            locationSelect.innerHTML = '<option value="">Sélectionner un lieu</option>';
            locations.forEach(location => {
                locationSelect.innerHTML += `<option value="${location.id}">${location.name}</option>`;
            });

            // Load categories
            const categoriesResponse = await fetch('/api/categories');
            const categories = await categoriesResponse.json();
            const categoriesContainer = document.getElementById('quickAddCategories');
            categoriesContainer.innerHTML = '';
            categories.forEach(category => {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'form-check';
                categoryDiv.innerHTML = `
                    <input type="checkbox" class="form-check-input" id="quickAdd_category_${category.id}" 
                           name="quickAddCategories" value="${category.id}">
                    <label class="form-check-label" for="quickAdd_category_${category.id}">
                        <span class="color-dot" style="background-color: ${category.color}"></span>
                        ${category.name}
                    </label>
                `;
                categoriesContainer.appendChild(categoryDiv);
            });
        } catch (error) {
            console.error('Error loading form data:', error);
            alert('Erreur lors du chargement des données du formulaire');
        }
    }

    function toggleCategory(categoryId) {
        const button = document.querySelector(`[data-category="${categoryId}"]`);
        if (!button) return;

        const existingError = document.querySelector('.calendar-container .alert');
        if (existingError) {
            existingError.remove();
        }

        if (categoryId === 'all') {
            // Activer toutes les catégories
            selectedCategories.clear();
            selectedCategories.add('all');
            document.querySelectorAll('#categoryFilters .btn').forEach(btn => {
                btn.classList.add('active');
                const catId = btn.getAttribute('data-category');
                if (catId !== 'all') {
                    selectedCategories.add(catId);
                }
            });
        } else {
            if (selectedCategories.has('all')) {
                selectedCategories.clear();
                document.querySelector('[data-category="all"]').classList.remove('active');
            }

            const categoryIdStr = categoryId.toString();
            if (selectedCategories.has(categoryIdStr)) {
                selectedCategories.delete(categoryIdStr);
                button.classList.remove('active');
            } else {
                selectedCategories.add(categoryIdStr);
                button.classList.add('active');
            }
        }

        fetchActivities();
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

        let headerText = '';
        switch (currentView) {
            case 'day':
                headerText = currentDate.toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
                break;
            case 'week':
            case 'business-week':
                const startOfWeek = new Date(currentDate);
                if (currentView === 'business-week') {
                    // Ajuster au lundi
                    const day = startOfWeek.getDay();
                    const diff = day === 0 ? -6 : 1 - day;
                    startOfWeek.setDate(startOfWeek.getDate() + diff);
                } else {
                    // Ajuster au dimanche
                    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                }
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + (currentView === 'business-week' ? 4 : 6));

                // Format différent si même mois ou mois différents
                if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
                    headerText = `${startOfWeek.getDate()} au ${endOfWeek.getDate()} ${endOfWeek.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`;
                } else {
                    headerText = `${startOfWeek.getDate()} ${startOfWeek.toLocaleString('fr-FR', { month: 'long' })} au ${endOfWeek.getDate()} ${endOfWeek.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`;
                }
                break;
            default: // month view
                headerText = currentDate.toLocaleString('fr-FR', {
                    month: 'long',
                    year: 'numeric'
                });
        }

        document.getElementById('currentMonth').textContent =
            headerText.charAt(0).toUpperCase() + headerText.slice(1);
    }

    function updateCalendar() {
        const calendarGrid = document.querySelector('.calendar-grid');
        if (!calendarGrid) return;

        calendarGrid.className = `calendar-grid ${currentView}`;
        updateCalendarHeader();

        const calendarDates = document.getElementById('calendarDates');
        if (!calendarDates) return;

        calendarDates.innerHTML = '';

        switch (currentView) {
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

        fetchActivities();
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

            // Add quick add button
            const quickAddButton = document.createElement('button');
            quickAddButton.className = 'quick-add-button';
            quickAddButton.innerHTML = '<i class="bi bi-plus"></i>';
            quickAddButton.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = new bootstrap.Modal(document.getElementById('quickAddActivityModal'));
                document.getElementById('quickAddDate').value = date.toISOString().split('T')[0];
                loadQuickAddFormData(); // Load locations and categories
                modal.show();
            });
            cell.appendChild(quickAddButton);
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
                        <strong>Heure:</strong> ${activity.time || ''}
                        ${activity.end_time ? ` - ${activity.end_time}` : ''}
                    </p>
                ` : '<p><strong>Durée:</strong> Toute la journée</p>'}
                ${activity.location ? `<p><strong>Lieu:</strong> ${activity.location}</p>` : ''}
                ${activity.notes ? `<p><strong>Notes:</strong> ${activity.notes}</p>` : ''}
                ${activity.categories && activity.categories.length > 0 ? `
                    <p><strong>Catégories:</strong></p>
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

    const quickAddIsAllDay = document.getElementById('quickAddIsAllDay');
    const quickAddTimeContainer = document.getElementById('quickAddTimeContainer');
    const quickAddEndTimeContainer = document.getElementById('quickAddEndTimeContainer');
    const quickAddIsRecurring = document.getElementById('quickAddIsRecurring');
    const quickAddRecurrenceFields = document.getElementById('quickAddRecurrenceFields');

    if (quickAddIsAllDay && quickAddTimeContainer && quickAddEndTimeContainer) {
        quickAddIsAllDay.addEventListener('change', function() {
            quickAddTimeContainer.style.display = this.checked ? 'none' : 'block';
            quickAddEndTimeContainer.style.display = this.checked ? 'none' : 'block';
            if (this.checked) {
                document.getElementById('quickAddTime').value = '';
                document.getElementById('quickAddEndTime').value = '';
            }
        });
    }

    if (quickAddIsRecurring && quickAddRecurrenceFields) {
        quickAddIsRecurring.addEventListener('change', function() {
            quickAddRecurrenceFields.style.display = this.checked ? 'block' : 'none';
            if (!this.checked) {
                document.getElementById('quickAddRecurrenceType').value = 'daily';
                document.getElementById('quickAddRecurrenceEndDate').value = '';
            }
        });
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

async function saveQuickAddActivity() {
    try {
        const activity = {
            title: document.getElementById('quickAddTitle').value.trim(),
            date: document.getElementById('quickAddDate').value,
            end_date: document.getElementById('quickAddEndDate').value || null,
            is_all_day: document.getElementById('quickAddIsAllDay').checked,
            time: document.getElementById('quickAddIsAllDay').checked ? null : document.getElementById('quickAddTime').value,
            end_time: document.getElementById('quickAddIsAllDay').checked ? null : document.getElementById('quickAddEndTime').value,
            location_id: document.getElementById('quickAddLocation').value || null,
            category_ids: Array.from(document.querySelectorAll('input[name="quickAddCategories"]:checked'))
                .map(cb => parseInt(cb.value)),
            notes: document.getElementById('quickAddNotes').value.trim(),
            is_recurring: document.getElementById('quickAddIsRecurring').checked,
            recurrence_type: document.getElementById('quickAddIsRecurring').checked ?
                document.getElementById('quickAddRecurrenceType').value : null,
            recurrence_end_date: document.getElementById('quickAddIsRecurring').checked ?
                document.getElementById('quickAddRecurrenceEndDate').value : null
        };

        if (!activity.title || !activity.date) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        // Validate end date
        if (activity.end_date && activity.date > activity.end_date) {
            alert('La date de fin ne peut pas être antérieure à la date de début');
            return;
        }

        // Validate end time if not all day
        if (!activity.is_all_day && activity.time && activity.end_time && activity.time > activity.end_time) {
            alert('L\'heure de fin ne peut pas être antérieure à l\'heure de début');
            return;
        }

        // Validate recurrence end date
        if (activity.is_recurring && !activity.recurrence_end_date) {
            alert('Veuillez spécifier une date de fin pour l\'activité récurrente');
            return;
        }

        const response = await fetch('/api/activities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activity)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Échec de l\'enregistrement de l\'activité');
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('quickAddActivityModal'));
        modal.hide();

        // Reset form
        document.getElementById('quickAddTitle').value = '';
        document.getElementById('quickAddDate').value = '';
        document.getElementById('quickAddEndDate').value = '';
        document.getElementById('quickAddIsAllDay').checked = false;
        document.getElementById('quickAddTime').value = '';
        document.getElementById('quickAddEndTime').value = '';
        document.getElementById('quickAddLocation').value = '';
        document.getElementById('quickAddNotes').value = '';
        document.getElementById('quickAddIsRecurring').checked = false;
        document.getElementById('quickAddRecurrenceType').value = 'daily';
        document.getElementById('quickAddRecurrenceEndDate').value = '';
        document.getElementById('quickAddRecurrenceFields').style.display = 'none';
        document.querySelectorAll('input[name="quickAddCategories"]').forEach(cb => cb.checked = false);

        // Refresh calendar
        await fetchActivities();
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
        alert('Erreur lors de l\'enregistrement de l\'activité: ' + error.message);
    }
}