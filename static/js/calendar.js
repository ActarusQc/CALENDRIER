[Previous content remains the same until line 233]

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
    }
    activityDiv.style.backgroundColor = categoryColor;
    
    if (position === 'start' || position === 'single') {
        let timeDisplay = '';
        if (!activity.is_all_day && activity.time) {
            timeDisplay = activity.time;
            if (activity.end_time) {
                timeDisplay += ` - ${activity.end_time}`;
            }
            timeDisplay = `<div class="time">${timeDisplay}</div>`;
        }
        
        activityDiv.innerHTML = `
            <div class="activity-content">
                ${timeDisplay}
                <div class="title">${activity.title}</div>
                ${activity.location ? `<div class="location">${activity.location}</div>` : ''}
                ${activity.is_recurring ? '<i class="bi bi-arrow-repeat ms-1" title="Activité récurrente"></i>' : ''}
            </div>
        `;
    }
    
    activityDiv.addEventListener('click', () => showActivityDetails(activity));
    return activityDiv;
}

[Rest of the file remains the same]
