from database import db
from flask_login import UserMixin
from datetime import datetime
import secrets

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    role = db.Column(db.String(20), nullable=False, default='reader')  # 'admin', 'creator', 'reader'
    share_token = db.Column(db.String(32), unique=True, index=True)

    def generate_share_token(self):
        self.share_token = secrets.token_hex(16)
        return self.share_token

    def can_manage_activities(self):
        return self.role in ['admin', 'creator']

    def can_manage_users(self):
        return self.role == 'admin'

# Association table for activity-category many-to-many relationship
activity_categories = db.Table('activity_categories',
    db.Column('activity_id', db.Integer, db.ForeignKey('activity.id', ondelete='CASCADE'), primary_key=True),
    db.Column('category_id', db.Integer, db.ForeignKey('category.id', ondelete='CASCADE'), primary_key=True)
)

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    color = db.Column(db.String(7), default='#6f42c1')  # Default color is theme purple

class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    activities = db.relationship('Activity', backref='location_obj', lazy=True)

class Activity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(128), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    time = db.Column(db.String(64))
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_all_day = db.Column(db.Boolean, default=False)
    end_date = db.Column(db.DateTime)
    end_time = db.Column(db.String(64))
    color = db.Column(db.String(7))  # Optional custom color override
    
    # Many-to-many relationship with categories
    categories = db.relationship('Category',
                               secondary=activity_categories,
                               lazy='subquery',
                               backref=db.backref('activities', lazy=True))
    
    # Recurrence fields
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_type = db.Column(db.String(20))  # 'daily', 'weekly', 'monthly', 'annually'
    recurrence_end_date = db.Column(db.DateTime)
