import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime, timedelta
from email_notifier import mail, EmailNotifier
from translations import translations, form_helpers
from functools import wraps

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Mail configuration
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
    lang = session.get('language', 'en')
    return translations[lang], form_helpers[lang]

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

@app.route('/manage-locations-categories')
@login_required
def manage_locations_categories():
    if not current_user.can_manage_activities():
        return redirect(url_for('index'))
    trans, helpers = get_translations()
    return render_template('manage_locations_categories.html', trans=trans, helpers=helpers)

@app.route('/admin')
@login_required
def admin():
    if not current_user.can_manage_activities():
        return redirect(url_for('index'))
    trans, helpers = get_translations()
    return render_template('admin.html', trans=trans, helpers=helpers, user=current_user)

@app.route('/calendar/<token>')
def public_calendar(token):
    user = User.query.filter_by(share_token=token).first()
    if not user:
        flash('Invalid share link')
        return redirect(url_for('index'))
    trans, helpers = get_translations()
    return render_template('public_calendar.html', trans=trans, helpers=helpers)

# Location Management API endpoints
@app.route('/api/locations')
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
        return jsonify({'error': 'Cannot delete location with associated activities'}), 400
        
    try:
        db.session.delete(location)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Category Management API endpoints
@app.route('/api/categories')
@login_required
def get_categories():
    categories = Category.query.all()
    return jsonify([{
        'id': category.id,
        'name': category.name
    } for category in categories])

@app.route('/api/categories/<int:category_id>', methods=['GET'])
@login_required
def get_category(category_id):
    category = Category.query.get_or_404(category_id)
    return jsonify({'id': category.id, 'name': category.name})

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
        
    category = Category(name=data['name'])
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
        
    if Category.query.filter(Category.name == data['name'], Category.id != category_id).first():
        return jsonify({'error': 'Category name already exists'}), 400
        
    category.name = data['name']
    
    try:
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
        return jsonify({'error': 'Cannot delete category with associated activities'}), 400
        
    try:
        db.session.delete(category)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Activity Management API endpoints
@app.route('/api/activities')
def get_activities():
    activities = Activity.query.all()
    return jsonify([{
        'id': a.id,
        'title': a.title,
        'date': a.date.strftime('%Y-%m-%d'),
        'time': a.time,
        'location_id': a.location_id,
        'location': a.location_obj.name if a.location_obj else None,
        'category_ids': [c.id for c in a.categories],
        'categories': [c.name for c in a.categories],
        'notes': a.notes,
        'is_recurring': a.is_recurring,
        'recurrence_type': a.recurrence_type,
        'recurrence_end_date': a.recurrence_end_date.strftime('%Y-%m-%d') if a.recurrence_end_date else None
    } for a in activities])

@app.route('/api/activities', methods=['POST'])
@login_required
def create_activity():
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.json
    
    try:
        activity = Activity(
            title=data['title'],
            date=datetime.strptime(data['date'], '%Y-%m-%d'),
            time=data['time'],
            location_id=data.get('location_id'),
            notes=data.get('notes'),
            is_recurring=data.get('is_recurring', False),
            recurrence_type=data.get('recurrence_type'),
            recurrence_end_date=datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d') if data.get('recurrence_end_date') else None
        )
        
        # Handle multiple categories
        categories = []
        for category_id in data.get('category_ids', []):
            category = Category.query.get(category_id)
            if category:
                categories.append(category)
        activity.categories = categories
        
        db.session.add(activity)
        db.session.commit()

        try:
            recipients = [user.email for user in User.query.all()]
            EmailNotifier.notify_activity_created(activity, recipients)
        except Exception as e:
            print(f"Error sending email notification: {e}")

        return jsonify({'success': True})
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
        activity.time = data['time']
        activity.location_id = data.get('location_id')
        activity.notes = data.get('notes')
        activity.is_recurring = data.get('is_recurring', False)
        activity.recurrence_type = data.get('recurrence_type')
        activity.recurrence_end_date = datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d') if data.get('recurrence_end_date') else None

        # Handle multiple categories
        categories = []
        for category_id in data.get('category_ids', []):
            category = Category.query.get(category_id)
            if category:
                categories.append(category)
        activity.categories = categories
        
        db.session.commit()

        try:
            recipients = [user.email for user in User.query.all()]
            EmailNotifier.notify_activity_updated(activity, recipients)
        except Exception as e:
            print(f"Error sending email notification: {e}")

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
    activity_title = activity.title
    activity_date = activity.date.strftime('%Y-%m-%d')
    
    try:
        db.session.delete(activity)
        db.session.commit()

        try:
            recipients = [user.email for user in User.query.all()]
            EmailNotifier.notify_activity_deleted(activity_title, activity_date, recipients)
        except Exception as e:
            print(f"Error sending email notification: {e}")

        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/share-link')
@login_required
def get_share_link():
    if not current_user.share_token:
        current_user.generate_share_token()
        db.session.commit()
    return jsonify({'share_link': current_user.share_token})

@app.route('/api/share-link/generate', methods=['POST'])
@login_required
def generate_share_link():
    current_user.generate_share_token()
    db.session.commit()
    return jsonify({'share_link': current_user.share_token})

with app.app_context():
    db.create_all()
    
    # Create admin user if it doesn't exist
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            email='admin@example.com',
            password_hash=generate_password_hash('admin'),
            role='admin'
        )
        db.session.add(admin)
        db.session.commit()

        # Create some default categories
        default_categories = ['Walking Club', 'Bingo', 'Social', 'Coffee Time']
        for category_name in default_categories:
            if not Category.query.filter_by(name=category_name).first():
                category = Category(name=category_name)
                db.session.add(category)
        
        # Create some default locations
        default_locations = ['Main Hall', 'Garden', 'Library', 'Dining Room']
        for location_name in default_locations:
            if not Location.query.filter_by(name=location_name).first():
                location = Location(name=location_name)
                db.session.add(location)
        
        db.session.commit()
