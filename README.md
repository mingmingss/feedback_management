# 학생 피드백 관리 시스템 (Student Feedback Management System)

A system for managing student feedback after classes. Teachers can create, save, and view feedback for each student.

## Project Structure

This project consists of two main parts:

- `client/`: Frontend React application built with Vite
- `server/`: Backend Flask application with PostgreSQL database

## Features

- Student management (add/view students)
- Feedback creation using templates
- Feedback history viewing
- Responsive design for desktop and mobile use

## Setup Instructions

### Prerequisites

- Node.js (v16+) for the frontend
- Python (v3.8+) for the backend
- PostgreSQL database

### Backend Setup

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up PostgreSQL database:
   - Create a database named `feedback_db`
   - Update the database URI in `main.py` if needed

4. Run the Flask server:
   ```
   python main.py
   ```
   The server will run on http://localhost:8080

### Frontend Setup

1. Navigate to the client directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```
   The frontend will run on http://localhost:5173

## API Endpoints

### Students
- `GET /api/students`: Get all students
- `POST /api/students`: Create a new student
- `GET /api/students/{student_id}`: Get details of a specific student

### Feedback
- `POST /api/feedback`: Create a new feedback
- `GET /api/feedback/{student_id}`: Get all feedback for a specific student

## Technologies Used

- **Frontend**:
  - React
  - React Router
  - Axios
  - Vite

- **Backend**:
  - Flask
  - SQLAlchemy
  - PostgreSQL
  - Flask-CORS

## License

This project is licensed under the MIT License.
