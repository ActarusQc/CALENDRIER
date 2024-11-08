import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from email_notifier import mail, EmailNotifier
from translations import translations, form_helpers
from functools import wraps
from database import db

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

def init_admin_user():
    with app.app_context():
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@example.com',
                password_hash=generate_password_hash('admin'),
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()

init_admin_user()

with app.app_context():
    db.create_all()

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
@login_required
def get_activity(activity_id):
    activity = Activity.query.get_or_404(activity_id)
    return jsonify({
        'id': activity.id,
        'title': activity.title,
        'date': activity.date.strftime('%Y-%m-%d'),
        'time': activity.time,
        'end_date': activity.end_date.strftime('%Y-%m-%d') if activity.end_date else None,
        'end_time': activity.end_time,
        'location_id': activity.location_id,
        'category_ids': [c.id for c in activity.categories],
        'notes': activity.notes,
        'is_all_day': activity.is_all_day,
        'is_recurring': activity.is_recurring,
        'recurrence_type': activity.recurrence_type,
        'recurrence_end_date': activity.recurrence_end_date.strftime('%Y-%m-%d') if activity.recurrence_end_date else None
    })

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
@login_required
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
    
    if category.activities:
        return jsonify({'error': 'Cannot delete a category that has associated activities'}), 400
    
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
        return jsonify({'error': 'Cannot delete a location that has associated activities'}), 400
    
    try:
        db.session.delete(location)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
