import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

function FeedbackForm({ isNewStudent, refreshStudents }) {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previousFeedbacks, setPreviousFeedbacks] = useState([]);
  
  // API 기본 URL 설정 - 개발 환경과 프로덕션 환경 모두 지원
  const apiBaseUrl = process.env.NODE_ENV === 'production' 
    ? '/api' 
    : 'http://localhost:8080/api';
  
  // Extract date from URL query parameters if present
  const queryParams = new URLSearchParams(location.search);
  const dateFromUrl = queryParams.get('date');
  
  const [formData, setFormData] = useState({
    student_id: studentId,
    class_date: dateFromUrl ? new Date(dateFromUrl).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    homework_completion: 100,
    class_content: '',
    parent_message: ''
  });
  
  const [newStudentData, setNewStudentData] = useState({
    name: ''
  });

  useEffect(() => {
    if (!isNewStudent && studentId) {
      fetchStudentInfo();
      fetchPreviousFeedbacks();
    }
  }, [isNewStudent, studentId]);

  const fetchStudentInfo = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiBaseUrl}/students/${studentId}`);
      setStudent(response.data.student);
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousFeedbacks = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/feedback/${studentId}`);
      setPreviousFeedbacks(response.data.feedbacks || []);
    } catch (error) {
      console.error('Error fetching previous feedbacks:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNewStudentChange = (e) => {
    const { name, value } = e.target;
    setNewStudentData({ ...newStudentData, [name]: value });
  };

  const loadPreviousFeedbackContent = () => {
    if (previousFeedbacks.length > 0) {
      // Get the most recent feedback (first one in the array)
      const recentFeedback = previousFeedbacks[0];
      
      // Extract content from the formatted feedback
      const contentLines = recentFeedback.class_content.split('\n');
      let classContent = '';
      
      // Find lines between 수업내용: and 부모님 전달사항:
      let inContentSection = false;
      for (const line of contentLines) {
        if (line.includes('📎수업내용:')) {
          inContentSection = true;
          continue;
        } else if (line.includes('📎부모님 전달사항:')) {
          inContentSection = false;
          break;
        }
        
        if (inContentSection && line.trim()) {
          classContent += line + '\n';
        }
      }
      
      setFormData({
        ...formData,
        class_content: classContent.trim()
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      let currentStudentId = studentId;
      
      // If it's a new student, create the student first
      if (isNewStudent) {
        const studentResponse = await axios.post(`${apiBaseUrl}/students`, newStudentData);
        currentStudentId = studentResponse.data.id;
      }
      
      // Format feedback content based on template
      let classDate;
      try {
        classDate = new Date(formData.class_date);
        if (isNaN(classDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (error) {
        console.error('Error parsing date:', error);
        // Use current date as fallback
        classDate = new Date();
      }
      
      const month = classDate.getMonth() + 1;
      const week = Math.ceil(classDate.getDate() / 7);
      
      // Create formatted class content
      const formattedContent = `📚 ${student?.name || newStudentData.name} ${month}월 ${week}주차 수업보고서📚

 📎지난숙제완성도: ${formData.homework_completion}%

 📎수업내용: 
${formData.class_content}

 📎부모님 전달사항: 
${formData.parent_message}`;
      
      // Create feedback
      const feedbackData = {
        ...formData,
        student_id: currentStudentId,
        homework_completion: parseInt(formData.homework_completion, 10),
        class_content: formattedContent
      };
      
      await axios.post(`${apiBaseUrl}/feedback`, feedbackData);
      
      // Refresh the student list
      if (refreshStudents) {
        refreshStudents();
      }
      
      // Navigate back to student details page
      navigate(isNewStudent ? '/' : `/student/${currentStudentId}`);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-form-container">
      <h2>{isNewStudent ? '새 학생 등록 및 피드백 작성' : '피드백 작성'}</h2>
      
      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : (
        <>
          {!isNewStudent && student && (
            <div className="student-info-header">
              <h3>{student.name}</h3>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="feedback-form">
            {isNewStudent && (
              <div className="form-section">
                <h3>학생 정보</h3>
                <div className="form-group">
                  <label htmlFor="name">이름:</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={newStudentData.name}
                    onChange={handleNewStudentChange}
                    required
                    placeholder="학생 이름을 입력하세요"
                  />
                </div>
              </div>
            )}
            
            <div className="form-section">
              <h3>피드백 정보</h3>
              <div className="form-group">
                <label htmlFor="class_date">수업 날짜:</label>
                <input
                  type="date"
                  id="class_date"
                  name="class_date"
                  value={formData.class_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="homework_completion">숙제 완성도 (%):</label>
                <div className="range-container">
                  <input
                    type="range"
                    id="homework_completion"
                    name="homework_completion"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.homework_completion}
                    onChange={handleInputChange}
                  />
                  <span>{formData.homework_completion}%</span>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="class_content">수업 내용:</label>
                <textarea
                  id="class_content"
                  name="class_content"
                  value={formData.class_content}
                  onChange={handleInputChange}
                  placeholder="수업에서 다룬 내용을 입력하세요"
                  required
                ></textarea>
              </div>
              
              <div className="form-group">
                <label htmlFor="parent_message">부모님 전달사항:</label>
                <textarea
                  id="parent_message"
                  name="parent_message"
                  value={formData.parent_message}
                  onChange={handleInputChange}
                  placeholder="부모님께 전달할 메시지를 입력하세요"
                ></textarea>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                피드백 저장
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => navigate(isNewStudent ? '/' : `/student/${studentId}`)}
              >
                취소
              </button>
            </div>
          </form>
          
          {!isNewStudent && previousFeedbacks.length > 0 && (
            <div className="previous-feedbacks-section">
              <h3>이전 피드백</h3>
              {previousFeedbacks.map((feedback, index) => (
                <div key={index} className="formatted-feedback">
                  <div className="feedback-date">
                    <strong>{new Date(feedback.class_date).toLocaleDateString('ko-KR', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</strong>
                  </div>
                  <div className="feedback-content">
                    {feedback.class_content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FeedbackForm;
