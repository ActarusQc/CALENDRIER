from app import db
from flask_login import UserMixin
from datetime import datetime
import secrets

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    is_admin = db.Column(db.Boolean, default=False)
    share_token = db.Column(db.String(32), unique=True, index=True)

    def generate_share_token(self):
        self.share_token = secrets.token_hex(16)
        return self.share_token

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    activities = db.relationship('Activity', backref='category', lazy=True)

class Activity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(128), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    time = db.Column(db.String(64))
    location = db.Column(db.String(128))
    notes = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Recurrence fields
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_type = db.Column(db.String(20))  # 'daily', 'weekly', 'monthly'
    recurrence_end_date = db.Column(db.DateTime)
