import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import axios from 'axios'

// Components
import StudentList from './components/StudentList'
import FeedbackForm from './components/FeedbackForm'
import StudentDetail from './components/StudentDetail'
import ClassCalendar from './components/Calendar'

function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');

  // API 기본 URL 설정 - 개발 환경과 프로덕션 환경 모두 지원
  const apiBaseUrl = process.env.NODE_ENV === 'production' 
    ? '/api' 
    : 'http://localhost:8080/api';

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiBaseUrl}/students`);
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <h1>정인학원</h1>
            <nav className="main-nav">
              <Link 
                to="/" 
                className={activeTab === 'students' ? 'active' : ''}
                onClick={() => setActiveTab('students')}
              >
                학생 목록
              </Link>
              <Link 
                to="/calendar" 
                className={activeTab === 'calendar' ? 'active' : ''}
                onClick={() => setActiveTab('calendar')}
              >
                수업 일정
              </Link>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <div className="content-container">
            <Routes>
              <Route 
                path="/" 
                element={<StudentList students={students} loading={loading} refreshStudents={fetchStudents} />} 
              />
              <Route 
                path="/calendar" 
                element={<ClassCalendar />} 
              />
              <Route 
                path="/student/:studentId" 
                element={<StudentDetail refreshStudents={fetchStudents} />} 
              />
              <Route 
                path="/feedback/:studentId" 
                element={<FeedbackForm refreshStudents={fetchStudents} />} 
              />
              <Route 
                path="/student/new/feedback" 
                element={<FeedbackForm isNewStudent={true} refreshStudents={fetchStudents} />} 
              />
            </Routes>
          </div>
        </main>

        <footer className="app-footer">
          <div className="footer-content">
            <p>2025</p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
