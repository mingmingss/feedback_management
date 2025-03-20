import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function StudentDetail({ refreshStudents }) {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyState, setCopyState] = useState({});
  const [editMode, setEditMode] = useState(null);
  const [editFormData, setEditFormData] = useState({
    class_content: '',
    parent_message: '',
    homework_completion: ''
  });
  const [studentNotes, setStudentNotes] = useState('');
  const [saveNotesStatus, setSaveNotesStatus] = useState('');

  useEffect(() => {
    fetchStudentDetails();
  }, [studentId]);

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8080/api/students/${studentId}`);
      setStudent(response.data.student);
      setStudentNotes(response.data.student.notes || '');
      setFeedbacks(response.data.feedbacks || []);
    } catch (error) {
      console.error('Error fetching student details:', error);
      setError('학생 정보를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotesChange = (e) => {
    setStudentNotes(e.target.value);
  };

  const saveStudentNotes = async () => {
    try {
      setSaveNotesStatus('saving');
      await axios.put(`http://localhost:8080/api/students/${studentId}/notes`, {
        notes: studentNotes
      });
      setSaveNotesStatus('saved');
      
      // 3초 후 상태 메시지 제거
      setTimeout(() => {
        setSaveNotesStatus('');
      }, 3000);
    } catch (error) {
      console.error('Error saving student notes:', error);
      setSaveNotesStatus('error');
      
      setTimeout(() => {
        setSaveNotesStatus('');
      }, 3000);
    }
  };

  const handleDeleteStudent = async () => {
    const confirmed = window.confirm('이 학생을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (!confirmed) return;

    try {
      await axios.delete(`http://localhost:8080/api/students/${studentId}`);
      refreshStudents();
      navigate('/');
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('학생을 삭제하는 데 실패했습니다.');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopyState({ ...copyState, [id]: true });
        setTimeout(() => {
          setCopyState({ ...copyState, [id]: false });
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const startEditingFeedback = (feedback) => {
    setEditMode(feedback.id);
    setEditFormData({
      class_content: feedback.class_content,
      parent_message: feedback.parent_message || '',
      homework_completion: feedback.homework_completion || ''
    });
  };

  const cancelEditingFeedback = () => {
    setEditMode(null);
    setEditFormData({
      class_content: '',
      parent_message: '',
      homework_completion: ''
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };

  const handleUpdateFeedback = async (feedbackId) => {
    try {
      await axios.put(`http://localhost:8080/api/feedback/${feedbackId}`, editFormData);
      await fetchStudentDetails(); // Refresh the data
      setEditMode(null); // Exit edit mode
    } catch (error) {
      console.error('Error updating feedback:', error);
      alert('피드백을 수정하는 데 실패했습니다.');
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    const confirmed = window.confirm('이 피드백을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (!confirmed) return;

    try {
      await axios.delete(`http://localhost:8080/api/feedback/${feedbackId}`);
      await fetchStudentDetails(); // Refresh the data
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('피드백을 삭제하는 데 실패했습니다.');
    }
  };

  if (loading) {
    return <div className="loading">학생 정보를 불러오는 중...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!student) {
    return <div className="error-message">학생을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="student-detail-container">
      <div className="student-header">
        <h2>{student.name} 학생 정보</h2>
        <Link to="/" className="btn-back">← 목록으로 돌아가기</Link>
      </div>

      <div className="student-detail-layout">
        <div className="student-info-card">
          <p><strong>이름:</strong> {student.name}</p>
          
          <div className="scratch-board">
            <div className="scratch-header">
              <h3>선생님 메모</h3>
              <div className="save-status">
                {saveNotesStatus === 'saving' && <span className="saving">저장 중...</span>}
                {saveNotesStatus === 'saved' && <span className="saved">저장 완료!</span>}
                {saveNotesStatus === 'error' && <span className="error">저장 실패</span>}
              </div>
            </div>
            <textarea 
              className="scratch-textarea"
              placeholder="학생에 대한 메모를 입력하세요. 모든 선생님이 볼 수 있습니다."
              value={studentNotes}
              onChange={handleNotesChange}
              onBlur={saveStudentNotes}
            ></textarea>
          </div>
          
          <div className="student-action-buttons">
            <Link to={`/feedback/${studentId}`} className="btn-primary action-btn">
              피드백 작성
            </Link>
            
            <button 
              onClick={handleDeleteStudent} 
              className="btn-primary delete-btn action-btn" 
            >
              학생 삭제
            </button>
          </div>
        </div>

        <div className="feedback-history">
          <h3>피드백 기록</h3>
          
          {feedbacks.length === 0 ? (
            <div className="no-feedbacks">
              아직 작성된 피드백이 없습니다.
            </div>
          ) : (
            <div className="feedback-list">
              {feedbacks.map((feedback) => (
                <div key={feedback.id} className="feedback-card">
                  <div className="feedback-header">
                    <h4>{new Date(feedback.class_date).toLocaleDateString('ko-KR')} 피드백</h4>
                    <div className="feedback-actions">
                      <span className="feedback-date">
                        {new Date(feedback.created_at).toLocaleString('ko-KR')}
                      </span>
                      <button 
                        className="btn-icon edit-btn"
                        onClick={() => startEditingFeedback(feedback)}
                        title="피드백 수정"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon delete-btn"
                        onClick={() => handleDeleteFeedback(feedback.id)}
                        title="피드백 삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {editMode === feedback.id ? (
                    <div className="edit-feedback-form">
                      <div className="form-group">
                        <label>숙제 완성도 (%):</label>
                        <input 
                          type="number" 
                          name="homework_completion"
                          value={editFormData.homework_completion} 
                          onChange={handleEditInputChange}
                          className="form-input"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="form-group">
                        <label>수업 내용:</label>
                        <textarea
                          name="class_content"
                          value={editFormData.class_content}
                          onChange={handleEditInputChange}
                          className="form-input"
                          rows="5"
                        />
                      </div>
                      <div className="edit-buttons">
                        <button 
                          className="btn-primary"
                          onClick={() => handleUpdateFeedback(feedback.id)}
                        >
                          저장
                        </button>
                        <button 
                          className="btn-secondary"
                          onClick={cancelEditingFeedback}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="feedback-content">
                      <pre className="formatted-feedback">{feedback.class_content}</pre>
                      <button 
                        className={`copy-button ${copyState[feedback.id] ? 'copy-success' : ''}`}
                        onClick={() => copyToClipboard(feedback.class_content, feedback.id)}
                      >
                        {copyState[feedback.id] ? '복사 완료!' : '텍스트 복사'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDetail;
