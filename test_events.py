from datetime import datetime, timedelta
import requests

def create_test_events():
    # Create two overlapping all-day events
    event1 = {
        "title": "Test All Day Event 1",
        "date": (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
        "is_all_day": True,
        "notes": "Test event 1"
    }
    
    event2 = {
        "title": "Test All Day Event 2",
        "date": (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
        "is_all_day": True,
        "notes": "Test event 2"
    }
    
    # Create a multi-day event
    event3 = {
        "title": "Test Multi-Day Event",
        "date": (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
        "end_date": (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d'),
        "is_all_day": True,
        "notes": "Test multi-day event"
    }
    
    for event in [event1, event2, event3]:
        response = requests.post('http://localhost:5000/api/activities', json=event)
        print(f"Created event: {response.status_code}")

if __name__ == "__main__":
    create_test_events()
