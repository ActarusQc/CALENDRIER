// ... [previous code remains the same until line 4] ...
    loadActivities();
    loadLocationsAndCategories();
    setupForm();

    // Check for selected date parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const selectedDate = urlParams.get('selected_date');
    if (selectedDate) {
        // Pre-fill the date and show the modal
        document.getElementById('date').value = selectedDate;
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        modal.show();
    }
});

// ... [rest of the file remains the same] ...
