// Previous code remains the same...
    function createActivityElement(activity, position) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity';
        
        const categoryColor = activity.categories.length > 0 ? activity.categories[0].color : '#6f42c1';
        const startDate = new Date(activity.date);
        const endDate = activity.end_date ? new Date(activity.end_date) : startDate;
        const isMultiDay = endDate > startDate;
        
        if (isMultiDay && !activity.is_recurring) {
            activityDiv.classList.add('multi-day');
            activityDiv.classList.add(position);
            activityDiv.style.backgroundColor = categoryColor;
            
            const container = document.querySelector(`div.all-day-activities[data-date="${activity.displayDate.toISOString().split('T')[0]}"]`);
            if (container) {
                const existingEvents = container.querySelectorAll('.activity.multi-day');
                activityDiv.style.top = `${existingEvents.length * 32}px`;
            }
        } else {
            activityDiv.style.backgroundColor = categoryColor;
        }
        
        if (position === 'start' || position === 'single') {
            activityDiv.innerHTML = `
                <div class="activity-content">
                    <div class="title">${activity.title}</div>
                    ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
                    ${activity.is_recurring ? '<i class="bi bi-arrow-repeat ms-1" title="Activité récurrente"></i>' : ''}
                </div>
            `;
        }
        
        activityDiv.addEventListener('click', () => showActivityDetails(activity));
        
        return activityDiv;
    }

    function showAddActivityModal(date) {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);">
                    <div class="modal-header border-bottom border-light border-opacity-25">
                        <h5 class="modal-title text-white fw-bold">Ajouter une activité</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="quickAddActivityForm">
                            <div class="mb-3">
                                <label class="form-label text-white">Titre</label>
                                <input type="text" class="form-control bg-dark text-white" id="quickActivityTitle" required>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input type="checkbox" class="form-check-input" id="quickActivityAllDay" checked>
                                    <label class="form-check-label text-white">Toute la journée</label>
                                </div>
                            </div>
                            <div id="quickTimeFields" style="display: none;">
                                <div class="mb-3">
                                    <label class="form-label text-white">Heure de début</label>
                                    <input type="time" class="form-control bg-dark text-white" id="quickActivityTime">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label text-white">Heure de fin</label>
                                    <input type="time" class="form-control bg-dark text-white" id="quickActivityEndTime">
                                </div>
                            </div>
                            <input type="hidden" id="quickActivityDate" value="${date}">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                        <button type="button" class="btn btn-primary" onclick="quickSaveActivity()">Enregistrer</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalDiv);
        
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();
        
        // Set up all-day checkbox behavior
        const allDayCheckbox = modalDiv.querySelector('#quickActivityAllDay');
        const timeFields = modalDiv.querySelector('#quickTimeFields');
        allDayCheckbox.addEventListener('change', function() {
            timeFields.style.display = this.checked ? 'none' : 'block';
        });
        
        modalDiv.addEventListener('hidden.bs.modal', function () {
            document.body.removeChild(modalDiv);
        });
    }

    async function quickSaveActivity() {
        const activity = {
            title: document.getElementById('quickActivityTitle').value.trim(),
            date: document.getElementById('quickActivityDate').value,
            is_all_day: document.getElementById('quickActivityAllDay').checked,
            time: document.getElementById('quickActivityAllDay').checked ? null : document.getElementById('quickActivityTime').value,
            end_time: document.getElementById('quickActivityAllDay').checked ? null : document.getElementById('quickActivityEndTime').value
        };
        
        if (!activity.title) {
            alert('Veuillez saisir un titre');
            return;
        }
        
        try {
            const response = await fetch('/api/activities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(activity)
            });
            
            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.querySelector('.modal'));
                modal.hide();
                updateCalendar();
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Erreur lors de l'enregistrement de l'activité');
            }
        } catch (error) {
            console.error('Error saving activity:', error);
            alert('Erreur lors de l'enregistrement de l'activité');
        }
    }

    // Previous event listeners remain the same...
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    document.querySelector('[data-view="month"]').classList.add('active');
    updateCalendar();
});
