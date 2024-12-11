import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, Response
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from email_notifier import mail, EmailNotifier
from translations import translations, form_helpers
from functools import wraps
from database import db
from sqlalchemy import text
import pytz
import csv
from io import StringIO
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')

db.init_app(app)
mail.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

from models import User, Category, Activity, Location

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def get_translations():
    return translations['fr'], form_helpers['fr']

@app.route('/language/<lang>')
def set_language(lang):
    if lang in translations:
        session['language'] = lang
    return redirect(request.referrer or url_for('index'))

@app.route('/')
def index():
    trans, helpers = get_translations()
    return render_template('calendar.html', trans=trans, helpers=helpers)

@app.route('/login', methods=['GET', 'POST'])
def login():
    trans, helpers = get_translations()
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user and check_password_hash(user.password_hash, request.form['password']):
            login_user(user)
            return redirect(url_for('admin'))
        flash('Invalid username or password')
    return render_template('login.html', trans=trans, helpers=helpers)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/admin')
@login_required
def admin():
    if not current_user.can_manage_activities():
        return redirect(url_for('index'))
    trans, helpers = get_translations()
    return render_template('admin.html', trans=trans, helpers=helpers, user=current_user)

@app.route('/manage-locations-categories')
@login_required
def manage_locations_categories():
    if not current_user.can_manage_activities():
        return redirect(url_for('index'))
    trans, helpers = get_translations()
    return render_template('manage_locations_categories.html', trans=trans, helpers=helpers)

@app.route('/users')
@login_required
def manage_users():
    if not current_user.can_manage_users():
        return redirect(url_for('index'))
    trans, helpers = get_translations()
    users = User.query.all()
    return render_template('users.html', users=users, trans=trans, helpers=helpers)

@app.route('/api/activities', methods=['GET'])
def get_activities():
    activities = Activity.query.all()
    return jsonify([{
        'id': activity.id,
        'title': activity.title,
        'date': activity.date.strftime('%Y-%m-%d'),
        'time': activity.time,
        'end_date': activity.end_date.strftime('%Y-%m-%d') if activity.end_date else None,
        'end_time': activity.end_time,
        'location': activity.location_obj.name if activity.location_obj else None,
        'location_id': activity.location_id,
        'categories': [{
            'name': category.name,
            'color': category.color
        } for category in activity.categories],
        'category_ids': [category.id for category in activity.categories],
        'notes': activity.notes,
        'is_recurring': activity.is_recurring,
        'recurrence_type': activity.recurrence_type,
        'recurrence_end_date': activity.recurrence_end_date.strftime('%Y-%m-%d') if activity.recurrence_end_date else None,
        'is_all_day': activity.is_all_day
    } for activity in activities])

@app.route('/api/activities/<int:activity_id>', methods=['GET'])
def get_activity(activity_id):
    activity = Activity.query.get_or_404(activity_id)
    print(f"Fetching activity {activity_id}:")
    print(f"Location ID: {activity.location_id}")
    print(f"Category IDs: {[c.id for c in activity.categories]}")
    
    response_data = {
        'id': activity.id,
        'title': activity.title,
        'date': activity.date.strftime('%Y-%m-%d'),
        'time': activity.time,
        'end_date': activity.end_date.strftime('%Y-%m-%d') if activity.end_date else None,
        'end_time': activity.end_time,
        'location': activity.location_obj.name if activity.location_obj else None,
        'location_id': activity.location_id,
        'notes': activity.notes,
        'is_all_day': activity.is_all_day,
        'is_recurring': activity.is_recurring,
        'categories': [{
            'name': category.name,
            'color': category.color
        } for category in activity.categories],
        'category_ids': [category.id for category in activity.categories],
        'recurrence_type': activity.recurrence_type,
        'recurrence_end_date': activity.recurrence_end_date.strftime('%Y-%m-%d') if activity.recurrence_end_date else None
    }
    print("Response data:", response_data)
    return jsonify(response_data)

@app.route('/api/import-activities', methods=['POST'])
@login_required
def import_activities():
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Invalid file type'}), 400

    try:
        try:
            # Read CSV file and skip empty rows at the beginning
            content = file.stream.read().decode("UTF-8-sig")  # Handle BOM if present
            print("Reading CSV content...")
            
            # Skip empty lines at the start
            lines = [line for line in content.split('\n') if line.strip()]
            
            # Find the header row (the one containing "Date de l'évènement")
            header_index = -1
            for i, line in enumerate(lines):
                if "Date de l'évènement" in line:
                    header_index = i
                    break
            
            if header_index == -1:
                print("Could not find header row in CSV")
                return jsonify({'error': 'Invalid CSV format: header row not found'}), 400
            
            # Reconstruct CSV with correct header
            csv_content = '\n'.join(lines[header_index:])
            stream = StringIO(csv_content)
            csv_reader = csv.DictReader(stream, delimiter=';')
            
            print("CSV Headers found:", csv_reader.fieldnames)
            
            activities_to_create = []
            for row in csv_reader:
                # Skip empty rows
                if not any(row.values()):
                    continue
                
                try:
                    # Parse date
                    date_str = row.get("Date de l'évènement", '').strip()
                    if not date_str:
                        print(f"Skipping row - no date found: {row}")
                        continue
                        
                    try:
                        date = datetime.strptime(date_str, '%d-%m-%Y')
                    except ValueError as e:
                        print(f"Error parsing date {date_str}: {e}")
                        continue

                    # Get or create location
                    location_name = row.get('Nom de la salle', '').strip()
                    location = None
                    if location_name:
                        location = Location.query.filter_by(name=location_name).first()
                        if not location:
                            location = Location(name=location_name)
                            db.session.add(location)
                            db.session.flush()

                    # Get event title
                    title = row.get("Nom de l'événement ou de type", '').strip()
                    if not title:
                        title = row.get("nom de l'événement", '').strip()
                    if not title:
                        title = 'Événement importé'

                    # Parse times
                    start_time = row.get('Heure de début', '').strip()
                    end_time = row.get('Heure de fin', '').strip()
                    
                    # Format times to 24-hour format if they exist
                    if start_time:
                        try:
                            # Handle format "07H00"
                            start_time = start_time.upper().replace('H', ':')
                            if len(start_time) == 4:  # Format "7:00"
                                start_time = f"0{start_time}"
                        except ValueError as e:
                            print(f"Error parsing start time {start_time}: {e}")
                            start_time = None
                            
                    if end_time:
                        try:
                            # Handle format "07H00"
                            end_time = end_time.upper().replace('H', ':')
                            if len(end_time) == 4:  # Format "7:00"
                                end_time = f"0{end_time}"
                        except ValueError as e:
                            print(f"Error parsing end time {end_time}: {e}")
                            end_time = None

                    print(f"Processing row: Date={date_str}, Title={title}, Time={start_time}-{end_time}, Location={location_name}")

            # Create activity with all available information
                    activity = Activity(
                        title=title,
                        date=date,
                        time=start_time,
                        end_time=end_time,
                        location_id=location.id if location else None,
                        notes=row.get("Contrat #", '').strip(),  # Using contract number as notes
                        is_all_day=not bool(start_time),
                        is_recurring=False
                    )
                    activities_to_create.append(activity)
                    print(f"Activity prepared: {activity.title} on {activity.date}")
                    
                except Exception as row_error:
                    print(f"Error processing row: {row_error}")
                    continue

            if not activities_to_create:
                print("No valid activities found in CSV")
                return jsonify({'error': 'No valid activities found in CSV'}), 400

            # Save all activities
            print(f"Attempting to save {len(activities_to_create)} activities...")
            for activity in activities_to_create:
                db.session.add(activity)
            
            db.session.commit()
            print(f"Successfully imported {len(activities_to_create)} activities")
            return jsonify({'success': True, 'count': len(activities_to_create)})
            
        except Exception as e:
            print(f"Error processing CSV: {str(e)}")
            return jsonify({'error': f'Error processing CSV: {str(e)}'}), 500

    except Exception as e:
        db.session.rollback()
        print('Error importing activities:', str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/activities', methods=['POST'])
@login_required
def create_activity():
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    try:
        base_activity = Activity(
            title=data['title'],
            date=datetime.strptime(data['date'], '%Y-%m-%d'),
            time=None if data.get('is_all_day') else data.get('time'),
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d') if data.get('end_date') else None,
            end_time=None if data.get('is_all_day') else data.get('end_time'),
            is_all_day=data.get('is_all_day', False),
            location_id=data.get('location_id'),
            notes=data.get('notes', ''),
            is_recurring=data.get('is_recurring', False),
            recurrence_type=data.get('recurrence_type'),
            recurrence_end_date=datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d') if data.get('recurrence_end_date') else None
        )
        
        if data.get('category_ids'):
            categories = Category.query.filter(Category.id.in_(data['category_ids'])).all()
            base_activity.categories = categories
        
        activities_to_create = [base_activity]
        
        if data.get('is_recurring') and data.get('recurrence_type') and data.get('recurrence_end_date'):
            start_date = datetime.strptime(data['date'], '%Y-%m-%d')
            end_date = datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d')
            
            recurring_dates = generate_recurring_dates(start_date, data['recurrence_type'], end_date)
            
            for date in recurring_dates[1:]:
                recurring_activity = Activity(
                    title=data['title'],
                    date=date,
                    time=data.get('time'),
                    end_date=date + (base_activity.end_date - base_activity.date) if base_activity.end_date else None,
                    end_time=data.get('end_time'),
                    is_all_day=data.get('is_all_day', False),
                    location_id=data.get('location_id'),
                    notes=data.get('notes', ''),
                    is_recurring=True,
                    recurrence_type=data.get('recurrence_type'),
                    recurrence_end_date=end_date
                )
                recurring_activity.categories = categories if data.get('category_ids') else []
                activities_to_create.append(recurring_activity)
        
        for activity in activities_to_create:
            db.session.add(activity)
        
        db.session.commit()
        
        # Comment out email notification as requested by manager
        # EmailNotifier.notify_activity_created(base_activity, [current_user.email])
            
        return jsonify({'success': True, 'id': base_activity.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/activities/<int:activity_id>', methods=['PUT'])
@login_required
def update_activity(activity_id):
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
    
    activity = Activity.query.get_or_404(activity_id)
    data = request.json
    
    try:
        activity.title = data['title']
        activity.date = datetime.strptime(data['date'], '%Y-%m-%d')
        activity.is_all_day = data.get('is_all_day', False)
        activity.time = None if data.get('is_all_day') else data.get('time')
        activity.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d') if data.get('end_date') else None
        activity.end_time = None if data.get('is_all_day') else data.get('end_time')
        activity.location_id = data.get('location_id')
        activity.notes = data.get('notes', '')
        activity.is_recurring = data.get('is_recurring', False)
        activity.recurrence_type = data.get('recurrence_type')
        activity.recurrence_end_date = datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d') if data.get('recurrence_end_date') else None
        
        if data.get('category_ids'):
            categories = Category.query.filter(Category.id.in_(data['category_ids'])).all()
            activity.categories = categories
        
        db.session.commit()
        
        # Comment out email notification as requested by manager
        # EmailNotifier.notify_activity_updated(activity, [current_user.email])
            
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/activities/bulk-delete', methods=['POST'])
@login_required
def bulk_delete_activities():
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        data = request.json
        if not data or 'ids' not in data:
            return jsonify({'error': 'No activity IDs provided'}), 400
        
        activities = Activity.query.filter(Activity.id.in_(data['ids'])).all()
        for activity in activities:
            db.session.delete(activity)
        
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/activities/<int:activity_id>', methods=['DELETE'])
@login_required
def delete_activity(activity_id):
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
    
    activity = Activity.query.get_or_404(activity_id)
    try:
        db.session.delete(activity)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([{
        'id': category.id,
        'name': category.name,
        'color': category.color
    } for category in categories])

@app.route('/api/categories/<int:category_id>', methods=['GET'])
@login_required
def get_category(category_id):
    category = Category.query.get_or_404(category_id)
    return jsonify({
        'id': category.id,
        'name': category.name,
        'color': category.color
    })

@app.route('/api/categories', methods=['POST'])
@login_required
def create_category():
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    if not data.get('name'):
        return jsonify({'error': 'Category name is required'}), 400
    
    if Category.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Category already exists'}), 400
    
    category = Category(
        name=data['name'],
        color=data.get('color', '#6f42c1')
    )
    db.session.add(category)
    
    try:
        db.session.commit()
        return jsonify({'success': True, 'id': category.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories/<int:category_id>', methods=['PUT'])
@login_required
def update_category(category_id):
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
    
    category = Category.query.get_or_404(category_id)
    data = request.json
    
    if not data.get('name'):
        return jsonify({'error': 'Category name is required'}), 400
    
    existing = Category.query.filter(
        Category.name == data['name'],
        Category.id != category_id
    ).first()
    
    if existing:
        return jsonify({'error': 'Category name already exists'}), 400
    
    try:
        category.name = data['name']
        category.color = data.get('color', '#6f42c1')
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
@login_required
def delete_category(category_id):
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
    
    category = Category.query.get_or_404(category_id)
    try:
        db.session.delete(category)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations', methods=['GET'])
@login_required
def get_locations():
    locations = Location.query.all()
    return jsonify([{
        'id': location.id,
        'name': location.name
    } for location in locations])

@app.route('/api/locations/<int:location_id>', methods=['GET'])
@login_required
def get_location(location_id):
    location = Location.query.get_or_404(location_id)
    return jsonify({'id': location.id, 'name': location.name})

@app.route('/api/locations', methods=['POST'])
@login_required
def create_location():
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    if not data.get('name'):
        return jsonify({'error': 'Location name is required'}), 400
    
    if Location.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Location already exists'}), 400
    
    location = Location(name=data['name'])
    db.session.add(location)
    
    try:
        db.session.commit()
        return jsonify({'success': True, 'id': location.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations/<int:location_id>', methods=['PUT'])
@login_required
def update_location(location_id):
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
    
    location = Location.query.get_or_404(location_id)
    data = request.json
    
    if not data.get('name'):
        return jsonify({'error': 'Location name is required'}), 400
    
    if Location.query.filter(Location.name == data['name'], Location.id != location_id).first():
        return jsonify({'error': 'Location name already exists'}), 400
    
    location.name = data['name']
    
    try:
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations/<int:location_id>', methods=['DELETE'])
@login_required
def delete_location(location_id):
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
    
    location = Location.query.get_or_404(location_id)
    
    if location.activities:
        return jsonify({'error': 'Cannot delete location that has associated activities'}), 400
    
    try:
        db.session.delete(location)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users')
@login_required
def get_users():
    if not current_user.can_manage_users():
        return jsonify({'error': 'Unauthorized'}), 403
    users = User.query.all()
    return jsonify([{
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role
    } for user in users])

@app.route('/api/users/<int:user_id>')
@login_required
def get_user(user_id):
    if not current_user.can_manage_users():
        return jsonify({'error': 'Unauthorized'}), 403
    user = User.query.get_or_404(user_id)
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role
    })

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    if not current_user.can_manage_users():
        return jsonify({'error': 'Unauthorized'}), 403
    
    user = User.query.get_or_404(user_id)
    data = request.json
    
    if not data.get('username') or not data.get('email') or not data.get('role'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        username_exists = User.query.filter(
            User.username == data['username'],
            User.id != user_id
        ).first()
        email_exists = User.query.filter(
            User.email == data['email'],
            User.id != user_id
        ).first()
        
        if username_exists:
            return jsonify({'error': 'Username already exists'}), 400
        if email_exists:
            return jsonify({'error': 'Email already exists'}), 400
        
        user.username = data['username']
        user.email = data['email']
        user.role = data['role']
        
        if data.get('password'):
            user.password_hash = generate_password_hash(data['password'])
        
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['POST'])
@login_required
def create_user():
    if not current_user.can_manage_users():
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    if not data.get('username') or not data.get('email') or not data.get('password') or not data.get('role'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    try:
        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            role=data['role']
        )
        db.session.add(user)
        db.session.commit()
        return jsonify({'success': True, 'id': user.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    if not current_user.can_manage_users():
        return jsonify({'error': 'Unauthorized'}), 403
    
    if user_id == current_user.id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    user = User.query.get_or_404(user_id)
    if user.username == 'admin':
        return jsonify({'error': 'Cannot delete admin user'}), 400
    
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def init_db():
    with app.app_context():
        db.drop_all()
        db.create_all()
        
        # Create admin user
        admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        admin = User(
            username='admin',
            email='admin@example.com',
            password_hash=generate_password_hash(admin_password),
            role='admin'
        )
        db.session.add(admin)
        
        # Create some sample categories with different colors
        categories_data = [
            ('Cours de langues', '#FF5733'),
            ('Activités sociales', '#33FF57'),
            ('Activités physiques', '#3357FF'),
            ('Ateliers', '#FF33F6')
        ]
        categories = []
        for name, color in categories_data:
            category = Category(name=name, color=color)
            categories.append(category)
            db.session.add(category)
        
        # Create some sample locations
        locations_data = ['Salle 101', 'Gymnase', 'Bibliothèque', 'Cafétéria']
        locations = []
        for location_name in locations_data:
            location = Location(name=location_name)
            locations.append(location)
            db.session.add(location)
        
        # Create some sample activities
        if categories and locations:
            activity1 = Activity(
                title='Cours de français',
                date=datetime.now(),
                time='09:00',
                end_time='10:30',
                location_id=locations[0].id,
                notes='Niveau débutant',
                is_all_day=False
            )
            activity1.categories = [categories[0]]
            db.session.add(activity1)
            
            activity2 = Activity(
                title='Café social',
                date=datetime.now(),
                time='14:00',
                end_time='16:00',
                location_id=locations[3].id,
                notes='Rencontre hebdomadaire',
                is_all_day=False
            )
            activity2.categories = [categories[1]]
            db.session.add(activity2)
            
            activity3 = Activity(
                title='Yoga',
                date=datetime.now(),
                time='17:00',
                end_time='18:00',
                location_id=locations[1].id,
                notes='Apportez votre tapis',
                is_all_day=False
            )
            activity3.categories = [categories[2]]
            db.session.add(activity3)
            
            activity4 = Activity(
                title='Atelier cuisine',
                date=datetime.now(),
                time='10:00',
                end_time='12:00',
                location_id=locations[3].id,
                notes='Cuisine du monde',
                is_all_day=False
            )
            activity4.categories = [categories[3]]
            db.session.add(activity4)
            
            db.session.commit()

def generate_recurring_dates(start_date, recurrence_type, end_date):
    dates = []
    current_date = start_date
    
    while current_date <= end_date:
        dates.append(current_date)
        
        if recurrence_type == 'daily':
            current_date = current_date + timedelta(days=1)
        elif recurrence_type == 'weekly':
            current_date = current_date + timedelta(weeks=1)
        elif recurrence_type == 'monthly':
            year = current_date.year + ((current_date.month + 1) // 12)
            month = ((current_date.month + 1) % 12) or 12
            day = min(current_date.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
            current_date = current_date.replace(year=year, month=month, day=day)
        elif recurrence_type == 'annually':
            current_date = current_date.replace(year=current_date.year + 1)
    
    return dates

if __name__ == '__main__':
    with app.app_context():
        # Verify database connection using SQLAlchemy text()
        try:
            db.session.execute(text('SELECT 1'))
            print('Successfully connected to the database!')
        except Exception as e:
            print('Failed to connect to the database!')
            print(e)
            exit(1)
        
    app.run(host='0.0.0.0', port=5000, debug=True)