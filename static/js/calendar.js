document.addEventListener('DOMContentLoaded', function() {
    // ... existing code up to showAddActivityModal function ...

    function showAddActivityModal(date) {
        // Create modal element
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
                                <label class="form-label text-white">Date</label>
                                <input type="date" class="form-control bg-dark text-white" id="quickActivityDate" value="${date}" required>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input type="checkbox" class="form-check-input" id="quickActivityAllDay">
                                    <label class="form-check-label text-white">Toute la journée</label>
                                </div>
                            </div>
                            <div id="quickTimeField">
                                <div class="mb-3">
                                    <label class="form-label text-white">Heure</label>
                                    <input type="time" class="form-control bg-dark text-white" id="quickActivityTime">
                                </div>
                            </div>
                            <!-- Recurring event section -->
                            <div class="mb-3">
                                <div class="form-check">
                                    <input type="checkbox" class="form-check-input" id="quickActivityRecurring">
                                    <label class="form-check-label text-white">Activité récurrente</label>
                                </div>
                                <div id="quickRecurrenceFields" style="display: none;">
                                    <div class="mt-3">
                                        <label class="form-label text-white">Type de récurrence</label>
                                        <select class="form-control bg-dark text-white" id="quickActivityRecurrenceType">
                                            <option value="daily">Quotidien</option>
                                            <option value="weekly">Hebdomadaire</option>
                                            <option value="monthly">Mensuel</option>
                                            <option value="annually">Annuel</option>
                                        </select>
                                    </div>
                                    <div class="mt-3">
                                        <label class="form-label text-white">Date de fin de récurrence</label>
                                        <input type="date" class="form-control bg-dark text-white" id="quickActivityRecurrenceEndDate">
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label text-white">Lieu</label>
                                <select class="form-control bg-dark text-white" id="quickActivityLocation">
                                    <option value="">Sélectionnez un lieu</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label text-white">Catégories</label>
                                <div id="quickActivityCategories" class="border rounded p-3">
                                    <!-- Categories will be loaded here -->
                                </div>
                            </div>
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
        
        // Setup all-day checkbox behavior
        const allDayCheckbox = modalDiv.querySelector('#quickActivityAllDay');
        const timeField = modalDiv.querySelector('#quickTimeField');
        allDayCheckbox.addEventListener('change', function() {
            timeField.style.display = this.checked ? 'none' : 'block';
        });

        // Setup recurring checkbox behavior
        const recurringCheckbox = modalDiv.querySelector('#quickActivityRecurring');
        const recurrenceFields = modalDiv.querySelector('#quickRecurrenceFields');
        recurringCheckbox.addEventListener('change', function() {
            recurrenceFields.style.display = this.checked ? 'block' : 'none';
        });
        
        // Load locations and categories
        fetch('/api/locations')
            .then(response => response.json())
            .then(locations => {
                const locationSelect = modalDiv.querySelector('#quickActivityLocation');
                locations.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location.id;
                    option.textContent = location.name;
                    locationSelect.appendChild(option);
                });
            });

        fetch('/api/categories')
            .then(response => response.json())
            .then(categories => {
                const categoriesContainer = modalDiv.querySelector('#quickActivityCategories');
                categories.forEach(category => {
                    const div = document.createElement('div');
                    div.className = 'form-check';
                    div.innerHTML = `
                        <input class="form-check-input" type="checkbox" 
                            value="${category.id}" id="quickCategory${category.id}">
                        <label class="form-check-label text-white">
                            <span class="color-dot" style="background-color: ${category.color}; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 8px;"></span>
                            ${category.name}
                        </label>
                    `;
                    categoriesContainer.appendChild(div);
                });
            });
        
        // Show modal
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();
        
        // Clean up on hide
        modalDiv.addEventListener('hidden.bs.modal', function () {
            document.body.removeChild(modalDiv);
        });
    }

    function quickSaveActivity() {
        const activity = {
            title: document.getElementById('quickActivityTitle').value,
            date: document.getElementById('quickActivityDate').value,
            is_all_day: document.getElementById('quickActivityAllDay').checked,
            time: document.getElementById('quickActivityAllDay').checked ? null : document.getElementById('quickActivityTime').value,
            location_id: document.getElementById('quickActivityLocation').value || null,
            category_ids: Array.from(document.querySelectorAll('#quickActivityCategories input:checked')).map(cb => parseInt(cb.value)),
            // Add recurring event data
            is_recurring: document.getElementById('quickActivityRecurring').checked,
            recurrence_type: document.getElementById('quickActivityRecurring').checked ? 
                document.getElementById('quickActivityRecurrenceType').value : null,
            recurrence_end_date: document.getElementById('quickActivityRecurring').checked ? 
                document.getElementById('quickActivityRecurrenceEndDate').value : null
        };

        // Validate required fields
        if (!activity.title || !activity.date) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        // Validate recurring activity fields
        if (activity.is_recurring && (!activity.recurrence_type || !activity.recurrence_end_date)) {
            alert('Pour une activité récurrente, veuillez sélectionner le type de récurrence et la date de fin');
            return;
        }

        // Validate dates
        if (activity.is_recurring && activity.recurrence_end_date < activity.date) {
            alert('La date de fin de récurrence ne peut pas être antérieure à la date de début');
            return;
        }
        
        fetch('/api/activities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activity)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Erreur lors de l\'enregistrement de l\'activité');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const modal = bootstrap.Modal.getInstance(document.querySelector('.modal'));
                modal.hide();
                updateCalendar();
            } else {
                throw new Error(data.error || 'Erreur lors de l\'enregistrement de l\'activité');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message);
        });
    }

    // Make functions globally available
    window.showAddActivityModal = showAddActivityModal;
    window.quickSaveActivity = quickSaveActivity;

    // Rest of the existing code...
});
