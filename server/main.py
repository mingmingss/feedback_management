from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
import pytz

# KST timezone for Korea
KST = pytz.timezone('Asia/Seoul')

def get_kst_now():
    """Return current time in KST timezone"""
    return datetime.now(pytz.utc).astimezone(KST)

app = Flask(__name__)
cors = CORS(app, origins='*')

# Create a 'data' directory if it doesn't exist
data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(data_dir, exist_ok=True)

# Database configuration
database_url = os.environ.get('DATABASE_URL')
if database_url:
    # Heroku/Vercel style database URL needs modification for SQLAlchemy
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql+pg8000://', 1)
    # Make sure we're using pg8000 driver explicitly
    elif database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+pg8000://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    # Fallback to SQLite for local development
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(data_dir, "feedback.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Models
class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    contact = db.Column(db.String(100))
    notes = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=get_kst_now)
    feedbacks = db.relationship('Feedback', backref='student', lazy=True)
    scheduled_classes = db.relationship('ScheduledClass', backref='student', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "contact": self.contact,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
        }

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    class_date = db.Column(db.DateTime, nullable=False, default=get_kst_now)
    textbook = db.Column(db.String(200))
    homework_completion = db.Column(db.Integer)  # percentage (0-100)
    class_content = db.Column(db.Text)
    parent_message = db.Column(db.Text)
    is_absent = db.Column(db.Boolean, default=False)  # Mark if student was absent
    created_at = db.Column(db.DateTime, default=get_kst_now)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'class_date': self.class_date.isoformat(),
            'textbook': self.textbook,
            'homework_completion': self.homework_completion,
            'class_content': self.class_content,
            'parent_message': self.parent_message,
            'is_absent': self.is_absent,
            'created_at': self.created_at.isoformat()
        }

class ScheduledClass(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0 = Monday, 6 = Sunday
    start_time = db.Column(db.String(5), nullable=False)  # Format: "HH:MM"
    duration_minutes = db.Column(db.Integer, default=60)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=get_kst_now)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'day_of_week': self.day_of_week,
            'start_time': self.start_time,
            'duration_minutes': self.duration_minutes,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

# Helper function to initialize the database
with app.app_context():
    # Create tables if they don't exist
    db.create_all()
    print("Database initialized.")

# API Routes
@app.route("/api/students", methods=["GET"])
def get_students():
    students = Student.query.all()
    return jsonify({
        "students": [student.to_dict() for student in students]
    })

@app.route("/api/students", methods=["POST"])
def create_student():
    data = request.get_json()
    student = Student(
        name=data.get('name')
    )
    db.session.add(student)
    db.session.commit()
    return jsonify(student.to_dict()), 201

@app.route("/api/students/<int:student_id>", methods=["GET"])
def get_student(student_id):
    student = Student.query.get_or_404(student_id)
    feedbacks = Feedback.query.filter_by(student_id=student_id).order_by(Feedback.created_at.desc()).all()
    
    return jsonify({
        'student': student.to_dict(),
        'feedbacks': [feedback.to_dict() for feedback in feedbacks]
    })

@app.route("/api/students/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    student = Student.query.get_or_404(student_id)
    
    # 학생과 관련된 피드백 및 일정도 모두 삭제
    Feedback.query.filter_by(student_id=student_id).delete()
    ScheduledClass.query.filter_by(student_id=student_id).delete()
    
    db.session.delete(student)
    db.session.commit()
    
    return jsonify({"message": "학생 정보가 성공적으로 삭제되었습니다."}), 200

@app.route("/api/feedback", methods=["POST"])
def create_feedback():
    data = request.get_json()
    try:
        class_date_str = data.get('class_date', get_kst_now().isoformat())
        # Handle different ISO date formats (with or without T)
        if 'T' in class_date_str:
            class_date = datetime.fromisoformat(class_date_str.replace('Z', '+00:00'))
        else:
            # Assume it's a date only string like '2025-03-19'
            class_date = datetime.strptime(class_date_str, '%Y-%m-%d')
    except ValueError as e:
        print(f"Date parsing error: {e}")
        # Fallback to current date
        class_date = get_kst_now()

    feedback = Feedback(
        student_id=data.get('student_id'),
        class_date=class_date,
        textbook=data.get('textbook'),
        homework_completion=data.get('homework_completion'),
        class_content=data.get('class_content'),
        parent_message=data.get('parent_message')
    )
    db.session.add(feedback)
    db.session.commit()
    return jsonify(feedback.to_dict()), 201

@app.route("/api/feedback/<int:feedback_id>", methods=["PUT"])
def update_feedback(feedback_id):
    feedback = Feedback.query.get_or_404(feedback_id)
    data = request.get_json()
    
    # Update feedback fields
    if 'class_date' in data:
        try:
            class_date_str = data.get('class_date')
            if 'T' in class_date_str:
                class_date = datetime.fromisoformat(class_date_str.replace('Z', '+00:00'))
            else:
                class_date = datetime.strptime(class_date_str, '%Y-%m-%d')
            feedback.class_date = class_date
        except ValueError:
            pass  # Keep existing date if parsing fails
    
    if 'textbook' in data:
        feedback.textbook = data.get('textbook')
    if 'homework_completion' in data:
        feedback.homework_completion = data.get('homework_completion')
    if 'class_content' in data:
        feedback.class_content = data.get('class_content')
    if 'parent_message' in data:
        feedback.parent_message = data.get('parent_message')
    if 'is_absent' in data:
        feedback.is_absent = data.get('is_absent')
    
    db.session.commit()
    return jsonify(feedback.to_dict()), 200

@app.route("/api/feedback/<int:feedback_id>", methods=["DELETE"])
def delete_feedback(feedback_id):
    feedback = Feedback.query.get_or_404(feedback_id)
    db.session.delete(feedback)
    db.session.commit()
    return jsonify({"message": "피드백이 성공적으로 삭제되었습니다."}), 200

@app.route("/api/feedback/<int:student_id>", methods=["GET"])
def get_student_feedback(student_id):
    feedbacks = Feedback.query.filter_by(student_id=student_id).order_by(Feedback.class_date.desc()).all()
    return jsonify({
        "feedbacks": [feedback.to_dict() for feedback in feedbacks]
    })

@app.route("/api/feedback/mark-absent", methods=["POST"])
def mark_student_absent():
    data = request.get_json()
    
    student_id = data.get('student_id')
    class_date_str = data.get('class_date')
    
    if not student_id or not class_date_str:
        return jsonify({"error": "학생 ID와 수업 날짜가 필요합니다."}), 400
    
    try:
        # Parse the date
        if 'T' in class_date_str:
            class_date = datetime.fromisoformat(class_date_str.replace('Z', '+00:00'))
        else:
            # Assume it's a date only string like '2025-03-19'
            class_date = datetime.strptime(class_date_str, '%Y-%m-%d')
            
        # Check if feedback already exists for this student on this date
        existing_feedback = Feedback.query.filter(
            Feedback.student_id == student_id,
            Feedback.class_date.date() == class_date.date()
        ).first()
        
        if existing_feedback:
            # Update existing feedback to mark as absent
            existing_feedback.is_absent = True
            db.session.commit()
            return jsonify(existing_feedback.to_dict()), 200
        else:
            # Create new feedback entry marked as absent
            new_feedback = Feedback(
                student_id=student_id,
                class_date=class_date,
                is_absent=True,
                class_content="학생 결석",
                parent_message=""
            )
            db.session.add(new_feedback)
            db.session.commit()
            return jsonify(new_feedback.to_dict()), 201
            
    except Exception as e:
        print(f"Error marking student as absent: {e}")
        return jsonify({"error": "결석 처리 중 오류가 발생했습니다."}), 500

# API Routes for Scheduled Classes
@app.route("/api/scheduled-classes", methods=["GET"])
def get_scheduled_classes():
    scheduled_classes = ScheduledClass.query.filter_by(is_active=True).all()
    return jsonify({
        "scheduled_classes": [sc.to_dict() for sc in scheduled_classes]
    })

@app.route("/api/scheduled-classes", methods=["POST"])
def create_scheduled_class():
    data = request.get_json()
    scheduled_class = ScheduledClass(
        student_id=data.get('student_id'),
        day_of_week=data.get('day_of_week'),
        start_time=data.get('start_time'),
        duration_minutes=data.get('duration_minutes', 60),
        is_active=data.get('is_active', True)
    )
    db.session.add(scheduled_class)
    db.session.commit()
    return jsonify(scheduled_class.to_dict()), 201

@app.route("/api/scheduled-classes/<int:sc_id>", methods=["PUT"])
def update_scheduled_class(sc_id):
    scheduled_class = ScheduledClass.query.get_or_404(sc_id)
    data = request.get_json()
    
    if 'student_id' in data:
        scheduled_class.student_id = data['student_id']
    if 'day_of_week' in data:
        scheduled_class.day_of_week = data['day_of_week']
    if 'start_time' in data:
        scheduled_class.start_time = data['start_time']
    if 'duration_minutes' in data:
        scheduled_class.duration_minutes = data['duration_minutes']
    if 'is_active' in data:
        scheduled_class.is_active = data['is_active']
    
    db.session.commit()
    return jsonify(scheduled_class.to_dict())

@app.route("/api/scheduled-classes/<int:sc_id>", methods=["DELETE"])
def delete_scheduled_class(sc_id):
    scheduled_class = ScheduledClass.query.get_or_404(sc_id)
    scheduled_class.is_active = False
    db.session.commit()
    return jsonify({"message": "Scheduled class deactivated successfully"})

@app.route("/api/student/<int:student_id>/scheduled-classes", methods=["GET"])
def get_student_scheduled_classes(student_id):
    scheduled_classes = ScheduledClass.query.filter_by(student_id=student_id, is_active=True).all()
    return jsonify({
        "scheduled_classes": [sc.to_dict() for sc in scheduled_classes]
    })

@app.route("/api/calendar/status", methods=["GET"])
def get_calendar_status():
    """Get feedback status for each scheduled class in a date range"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Convert string dates to datetime objects
    try:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        # Default to current month if dates are invalid
        today = get_kst_now()
        start_dt = datetime(today.year, today.month, 1)
        end_dt = datetime(today.year, today.month + 1, 1) if today.month < 12 else datetime(today.year + 1, 1, 1)
    
    # Get all active scheduled classes
    scheduled_classes = ScheduledClass.query.filter_by(is_active=True).all()
    
    # Get all feedback in the date range
    feedbacks = Feedback.query.filter(Feedback.class_date >= start_dt, Feedback.class_date < end_dt).all()
    
    # Create a dictionary to store feedback status for each day and student
    calendar_data = {}
    
    # Generate dates in the range
    current_date = start_dt
    while current_date < end_dt:
        day_of_week = current_date.weekday()
        date_str = current_date.strftime('%Y-%m-%d')
        
        calendar_data[date_str] = {
            'classes': [],
            'date': date_str
        }
        
        # Find scheduled classes for this day of the week
        for sc in scheduled_classes:
            if sc.day_of_week == day_of_week:
                student = Student.query.get(sc.student_id)
                
                # Check if feedback exists for this student on this date
                feedback_query = Feedback.query.filter(
                    Feedback.student_id == sc.student_id,
                    Feedback.class_date.date() == current_date.date()
                ).first()
                
                feedback_exists = feedback_query is not None
                is_absent = feedback_query.is_absent if feedback_query else False
                
                calendar_data[date_str]['classes'].append({
                    'student_id': sc.student_id,
                    'student_name': student.name,
                    'start_time': sc.start_time,
                    'duration_minutes': sc.duration_minutes,
                    'feedback_written': feedback_exists,
                    'is_absent': is_absent,
                    'feedback_id': feedback_query.id if feedback_query else None
                })
        
        current_date += timedelta(days=1)
    
    return jsonify({
        "calendar": [
            {
                'date': date,
                'classes': data['classes']
            } 
            for date, data in calendar_data.items()
        ]
    })

# Legacy endpoint - let's keep it for now
@app.route("/api/users", methods=["GET"])
def users():
    students = Student.query.all()
    return jsonify({
        "users": [student.name for student in students]
    })

@app.route("/api/students/<int:student_id>/notes", methods=["PUT"])
def update_student_notes(student_id):
    student = Student.query.get_or_404(student_id)
    data = request.get_json()
    
    if 'notes' in data:
        student.notes = data.get('notes')
    
    db.session.commit()
    return jsonify({"message": "학생 메모가 업데이트되었습니다."}), 200

if __name__ == "__main__":
    app.run(debug=True, port=8080)
