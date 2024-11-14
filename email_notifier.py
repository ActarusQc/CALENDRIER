from flask_mail import Mail, Message
from flask import current_app
from datetime import datetime, timedelta

mail = Mail()

class EmailNotifier:
    @staticmethod
    def send_activity_notification(recipients, subject, content):
        with current_app.app_context():
            msg = Message(
                subject=subject,
                recipients=recipients,
                body=content,
                sender=current_app.config['MAIL_USERNAME']
            )
            mail.send(msg)

    @staticmethod
    def notify_activity_created(activity, recipients):
        subject = "New Activity Added: " + activity.title
        content = f"""
A new activity has been added to the calendar:

Title: {activity.title}
Date: {activity.date.strftime('%Y-%m-%d')}
Time: {activity.time or 'Not specified'}
Location: {activity.location_obj.name if activity.location_obj else 'Not specified'}
Categories: {', '.join(c.name for c in activity.categories)}

Visit the calendar to view more details.
"""
        EmailNotifier.send_activity_notification(recipients, subject, content)

    @staticmethod
    def notify_activity_updated(activity, recipients):
        subject = "Activity Updated: " + activity.title
        content = f"""
An activity has been updated in the calendar:

Title: {activity.title}
Date: {activity.date.strftime('%Y-%m-%d')}
Time: {activity.time or 'Not specified'}
Location: {activity.location_obj.name if activity.location_obj else 'Not specified'}
Categories: {', '.join(c.name for c in activity.categories)}

Visit the calendar to view more details.
"""
        EmailNotifier.send_activity_notification(recipients, subject, content)

    @staticmethod
    def notify_activity_deleted(activity_title, activity_date, recipients):
        subject = "Activity Deleted: " + activity_title
        content = f"""
An activity has been removed from the calendar:

Title: {activity_title}
Date: {activity_date}

Please check the calendar for the updated schedule.
"""
        EmailNotifier.send_activity_notification(recipients, subject, content)