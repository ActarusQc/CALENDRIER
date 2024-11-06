[Previous content preserved...]

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
        
        // Calculate vertical position based on existing events
        const container = document.querySelector(`div.all-day-activities[data-date="${activity.displayDate.toISOString().split('T')[0]}"]`);
        if (container) {
            const existingEvents = container.querySelectorAll('.activity.multi-day');
            let topPosition = 0;
            
            // Check for overlapping events at the same vertical position
            const eventHeight = 32; // Height of each event including margin
            let foundPosition = false;
            
            while (!foundPosition) {
                const overlappingEvent = Array.from(existingEvents).find(event => {
                    const eventTop = parseInt(event.style.top);
                    return eventTop === topPosition;
                });
                
                if (!overlappingEvent) {
                    foundPosition = true;
                } else {
                    topPosition += eventHeight;
                }
            }
            
            activityDiv.style.top = `${topPosition}px`;
            
            // Update container height if needed
            const minHeight = topPosition + eventHeight + 4; // Add padding
            if (container.offsetHeight < minHeight) {
                container.style.minHeight = `${minHeight}px`;
            }
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

[Rest of the file preserved...]
