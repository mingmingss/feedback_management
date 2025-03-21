import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function StudentList({ students, loading, refreshStudents }) {
  const [newStudent, setNewStudent] = useState({ name: '' });
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // API 기본 URL 설정 - 개발 환경과 프로덕션 환경 모두 지원
  const apiBaseUrl = process.env.NODE_ENV === 'production' 
    ? '/api' 
    : 'http://localhost:8080/api';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewStudent({ ...newStudent, [name]: value });
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${apiBaseUrl}/students`, newStudent);
      setNewStudent({ name: '' });
      setIsAddingStudent(false);
      refreshStudents();
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const handleDeleteClick = (studentId) => {
    setDeleteConfirm(studentId);
  };

  const handleDeleteConfirm = async (studentId) => {
    try {
      await axios.delete(`${apiBaseUrl}/students/${studentId}`);
      refreshStudents();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  // Filter students based on search term
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">학생 목록을 불러오는 중...</div>;
  }

  return (
    <div className="student-list-container">
      <div className="student-content">
        <div className="student-list-header">
          <h2>학생 목록</h2>
          <button 
            className="btn-primary add-button"
            onClick={() => setIsAddingStudent(!isAddingStudent)}
          >
            {isAddingStudent ? '취소' : '학생 추가'}
          </button>
        </div>

        {isAddingStudent && (
          <form onSubmit={handleAddStudent} className="add-student-form">
            <div className="form-group">
              <label htmlFor="name">이름:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newStudent.name}
                onChange={handleInputChange}
                required
                placeholder="학생 이름"
              />
            </div>
            <button type="submit" className="btn-primary">학생 등록</button>
          </form>
        )}

        <div className="search-box">
          <input
            type="text"
            placeholder="학생 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="search-clear" 
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        {filteredStudents.length === 0 ? (
          <div className="no-students">
            {searchTerm 
              ? '검색 결과가 없습니다.' 
              : '등록된 학생이 없습니다. 새로운 학생을 추가해주세요.'}
          </div>
        ) : (
          <ul className="student-list">
            {filteredStudents.map((student) => (
              <li key={student.id} className="student-item">
                <Link to={`/student/${student.id}`} className="student-link">
                  <div className="student-name">{student.name}</div>
                </Link>
                <button 
                  className="delete-button" 
                  onClick={() => handleDeleteClick(student.id)}
                  title="학생 삭제"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
                {deleteConfirm === student.id && (
                  <div className="delete-confirm">
                    <p>정말 삭제하시겠습니까?</p>
                    <div className="delete-actions">
                      <button 
                        className="btn-danger" 
                        onClick={() => handleDeleteConfirm(student.id)}
                      >
                        삭제
                      </button>
                      <button 
                        className="btn-secondary" 
                        onClick={() => setDeleteConfirm(null)}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default StudentList;
