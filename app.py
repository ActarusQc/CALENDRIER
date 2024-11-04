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

db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

from models import User, Category, Activity, Location

# Initialize test data
with app.app_context():
    db.create_all()
    if Activity.query.count() == 0:
        # Add a test category
        category = Category.query.first()
        if not category:
            category = Category(name='Test Category', color='#6f42c1')
            db.session.add(category)
            
        # Add a test location
        location = Location.query.first()
        if not location:
            location = Location(name='Test Location')
            db.session.add(location)
            
        db.session.commit()
        
        # Add a test activity
        activity = Activity(
            title='Test Activity',
            date=datetime.now(),
            time='09:00',
            end_time='10:00',
            location_id=location.id,
            notes='Test activity for debugging'
        )
        activity.categories.append(category)
        db.session.add(activity)
        db.session.commit()
        print("Added test data to database")

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def get_translations():
    return translations['fr'], form_helpers['fr']

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.can_manage_users():
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

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

@app.route('/manage_users')
@login_required
@admin_required
def manage_users():
    trans, helpers = get_translations()
    users = User.query.all()  # Get all users to pass to template
    return render_template('users.html', trans=trans, helpers=helpers, users=users)

@app.route('/api/users', methods=['GET'])
@login_required
@admin_required
def get_users():
    users = User.query.all()
    return jsonify([{
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role
    } for user in users])

@app.route('/api/users/<int:user_id>', methods=['GET'])
@login_required
@admin_required
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role
    })

@app.route('/api/users', methods=['POST'])
@login_required
@admin_required
def create_user():
    data = request.get_json()
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        role=data['role']
    )
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role
    })

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@login_required
@admin_required
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    # Check username uniqueness if changed
    if data['username'] != user.username and User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    # Check email uniqueness if changed
    if data['email'] != user.email and User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    user.username = data['username']
    user.email = data['email']
    user.role = data['role']
    
    # Update password only if provided
    if 'password' in data and data['password']:
        user.password_hash = generate_password_hash(data['password'])
    
    db.session.commit()
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role
    })

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.username == 'admin':
        return jsonify({'error': 'Cannot delete admin user'}), 400
    
    db.session.delete(user)
    db.session.commit()
    return '', 204

@app.route('/api/activities', methods=['GET'])
def get_activities():
    activities = Activity.query.all()
    print(f"Returning {len(activities)} activities")  # Debug log
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

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([{
        'id': category.id,
        'name': category.name,
        'color': category.color
    } for category in categories])

@app.route('/api/locations', methods=['GET'])
def get_locations():
    locations = Location.query.all()
    return jsonify([{
        'id': location.id,
        'name': location.name
    } for location in locations])

@app.route('/manage_locations_categories')
@login_required
def manage_locations_categories():
    if not current_user.can_manage_activities():
        return redirect(url_for('index'))
    trans, helpers = get_translations()
    return render_template('manage_locations_categories.html', trans=trans, helpers=helpers)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
