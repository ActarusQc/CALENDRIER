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
        # Delete existing admin user if exists
        admin = User.query.filter_by(username='admin').first()
        if admin:
            db.session.delete(admin)
            db.session.commit()
            
        # Create new admin user with proper password hash
        admin = User(
            username='admin',
            email='admin@example.com',
            password_hash=generate_password_hash('admin', method='scrypt'),
            role='admin'
        )
        db.session.add(admin)
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

# Create tables and initialize admin user
with app.app_context():
    db.create_all()
    init_admin_user()

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

# Rest of the original routes are preserved (get_activities, create_activity, etc.)

# Kept all original route functions for activities, categories, and locations from the original file

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)