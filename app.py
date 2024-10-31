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

from models import User, Category, Activity

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

@app.route('/users')
@login_required
def manage_users():
    if not current_user.can_manage_users():
        return redirect(url_for('index'))
    trans, helpers = get_translations()
    users = User.query.all()
    return render_template('users.html', users=users, trans=trans, helpers=helpers)

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

@app.route('/api/users', methods=['POST'])
@login_required
def create_user():
    if not current_user.can_manage_users():
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.json
    
    # Validate required fields
    if not all(key in data for key in ['username', 'email', 'password', 'role']):
        return jsonify({'error': 'Missing required fields'}), 400
        
    # Check if username or email already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
        
    # Create new user
    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        role=data['role']
    )
    
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({'success': True, 'id': user.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/activities')
def get_activities():
    activities = Activity.query.all()
    return jsonify([{
        'id': a.id,
        'title': a.title,
        'date': a.date.strftime('%Y-%m-%d'),
        'time': a.time,
        'location': a.location,
        'category': a.category.name,
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
    category = Category.query.filter_by(name=data['category']).first()
    if not category:
        category = Category(name=data['category'])
        db.session.add(category)
        db.session.flush()
    
    activity = Activity(
        title=data['title'],
        date=datetime.strptime(data['date'], '%Y-%m-%d'),
        time=data['time'],
        location=data.get('location'),
        notes=data.get('notes'),
        category=category,
        is_recurring=data.get('is_recurring', False),
        recurrence_type=data.get('recurrence_type'),
        recurrence_end_date=datetime.strptime(data['recurrence_end_date'], '%Y-%m-%d') if data.get('recurrence_end_date') else None
    )
    db.session.add(activity)
    db.session.commit()

    try:
        recipients = [user.email for user in User.query.all()]
        EmailNotifier.notify_activity_created(activity, recipients)
    except Exception as e:
        print(f"Error sending email notification: {e}")

    return jsonify({'success': True})

@app.route('/api/activities/<int:activity_id>', methods=['PUT'])
@login_required
def update_activity(activity_id):
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
        
    activity = Activity.query.get_or_404(activity_id)
    data = request.json
    
    category = Category.query.filter_by(name=data['category']).first()
    if not category:
        category = Category(name=data['category'])
        db.session.add(category)
        db.session.flush()
    
    activity.title = data['title']
    activity.date = datetime.strptime(data['date'], '%Y-%m-%d')
    activity.time = data['time']
    activity.location = data.get('location')
    activity.notes = data.get('notes')
    activity.category = category
    
    db.session.commit()

    try:
        recipients = [user.email for user in User.query.all()]
        EmailNotifier.notify_activity_updated(activity, recipients)
    except Exception as e:
        print(f"Error sending email notification: {e}")

    return jsonify({'success': True})

@app.route('/api/activities/<int:activity_id>', methods=['DELETE'])
@login_required
def delete_activity(activity_id):
    if not current_user.can_manage_activities():
        return jsonify({'error': 'Unauthorized'}), 403
        
    activity = Activity.query.get_or_404(activity_id)
    activity_title = activity.title
    activity_date = activity.date.strftime('%Y-%m-%d')
    
    db.session.delete(activity)
    db.session.commit()

    try:
        recipients = [user.email for user in User.query.all()]
        EmailNotifier.notify_activity_deleted(activity_title, activity_date, recipients)
    except Exception as e:
        print(f"Error sending email notification: {e}")

    return jsonify({'success': True})

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
    db.drop_all()  # Drop all tables
    db.create_all()  # Recreate all tables
    
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
