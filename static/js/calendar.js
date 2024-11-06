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
        
        // Set top position for stacking
        const container = document.querySelector(`div.all-day-activities[data-date="${startDate.toISOString().split('T')[0]}"]`);
        if (container) {
            const existingActivities = container.querySelectorAll('.activity').length;
            activityDiv.style.top = `${existingActivities * 30}px`;
        }
    } else {
        activityDiv.style.backgroundColor = categoryColor;
    }
    
    // Add content only for start or single events
    if (position === 'start' || position === 'single') {
        let timeDisplay = '';
        if (!activity.is_all_day && activity.time) {
            timeDisplay = `${activity.time}${activity.end_time ? ' - ' + activity.end_time : ''}`;
        }
        
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
