#!/usr/bin/env python3
import os
import sys
import subprocess
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Create a minimal Flask app
app = Flask(__name__)

# Path to the data directory and database file
data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
db_file = os.path.join(data_dir, "feedback.db")

# Ensure the data directory exists
os.makedirs(data_dir, exist_ok=True)

# Check for DATABASE_URL environment variable
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith('postgres://'):
    # Heroku/Vercel style database URL needs modification for SQLAlchemy
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    print(f"Using PostgreSQL database at: {database_url}")
    
    # For PostgreSQL, we'll drop and recreate all tables
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db = SQLAlchemy(app)
    
    # Import models to ensure they're defined
    from main import Student, Feedback, ScheduledClass
    
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        print("Creating all tables...")
        db.create_all()
        print("PostgreSQL database has been reset.")
else:
    # Using SQLite
    # Check if the database file exists
    if os.path.exists(db_file):
        print(f"Removing existing SQLite database: {db_file}")
        try:
            os.remove(db_file)
            print("SQLite database successfully deleted.")
        except Exception as e:
            print(f"Error deleting database: {e}")
            sys.exit(1)
    else:
        print("No existing SQLite database found.")
    
    print("SQLite database has been reset. Run main.py to initialize a fresh database.")
