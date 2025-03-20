import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import { format, addMinutes, parseISO } from 'date-fns';
import 'react-calendar/dist/Calendar.css';

function ClassCalendar() {
  const [date, setDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState('15:00');
  const [duration, setDuration] = useState(60);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [dateStudents, setDateStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCalendarData();
    fetchStudents();
  }, [date]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the first and last day of the month
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      
      console.log(`Fetching calendar data from ${startDate} to ${endDate}`);
      
      const response = await axios.get(`http://localhost:8080/api/calendar/status?start_date=${startDate}&end_date=${endDate}`);
      console.log('Calendar data received:', response.data);
      
      if (response.data && Array.isArray(response.data.calendar)) {
        setCalendarData(response.data.calendar);
      } else {
        console.error('Invalid calendar data format:', response.data);
        setCalendarData([]);
        setError('서버에서 받은 데이터 형식이 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setError('달력 데이터를 불러오는 데 실패했습니다.');
      setCalendarData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/students');
      if (response.data && response.data.students) {
        setStudents(response.data.students);
        if (response.data.students.length > 0 && !selectedStudent) {
          setSelectedStudent(response.data.students[0].id.toString());
        }
      } else {
        console.error('Invalid students data format:', response.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const addScheduledClass = async () => {
    if (!selectedStudent || !startTime) {
      alert('학생과 시작 시간을 선택해주세요.');
      return;
    }

    try {
      await axios.post('http://localhost:8080/api/scheduled-classes', {
        student_id: parseInt(selectedStudent),
        day_of_week: parseInt(dayOfWeek),
        start_time: startTime,
        duration_minutes: parseInt(duration)
      });
      
      // Refresh calendar data
      fetchCalendarData();
      alert('수업 일정이 추가되었습니다.');
    } catch (error) {
      console.error('Error adding scheduled class:', error);
      alert('수업 일정을 추가하는데 오류가 발생했습니다.');
    }
  };

  const goToFeedbackForm = (studentId, date) => {
    // First set the date in the right format
    const formattedDate = format(new Date(date), 'yyyy-MM-dd');
    
    // Navigate to the feedback form with the student ID and pre-set the date
    navigate(`/feedback/${studentId}?date=${formattedDate}`);
  };

  // Mark a student as absent for a date
  const markStudentAsAbsent = async (studentId, date) => {
    try {
      const response = await axios.post('http://localhost:8080/api/feedback/mark-absent', {
        student_id: studentId,
        class_date: date
      });
      
      if (response.status === 200 || response.status === 201) {
        // Update local state
        setDateStudents(dateStudents.map(student => {
          if (student.student_id === studentId) {
            return {
              ...student,
              is_absent: true,
              feedback_written: true // Consider it as "taken care of"
            };
          }
          return student;
        }));
        
        // Refresh calendar data
        fetchCalendarData();
        alert('학생을 결석으로 표시했습니다.');
      }
    } catch (error) {
      console.error('Error marking student as absent:', error);
      alert('결석 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDateClick = (clickedDate) => {
    try {
      const formattedDate = format(clickedDate, 'yyyy-MM-dd');
      
      // Find data for this date
      const dateData = calendarData.find(item => item.date === formattedDate);
      
      if (dateData) {
        setDateStudents(dateData.classes || []);
      } else {
        setDateStudents([]);
      }
      
      setSelectedDate(clickedDate);
      setShowDatePopup(true);
    } catch (error) {
      console.error('Error handling date click:', error);
      alert('날짜 선택 처리 중 오류가 발생했습니다.');
    }
  };

  // Add a new student class to the selected date
  const addStudentToDate = async () => {
    if (!selectedStudent || !selectedDate) return;
    
    // Get the day of week from selected date
    const dayOfWeek = selectedDate.getDay();
    
    // Always use a default time 
    const defaultTime = '15:00';
    
    try {
      await axios.post('http://localhost:8080/api/scheduled-classes', {
        student_id: parseInt(selectedStudent),
        day_of_week: dayOfWeek === 0 ? 6 : dayOfWeek - 1, // Convert to match backend (0 = Monday)
        start_time: defaultTime,
        duration_minutes: parseInt(duration)
      });
      
      // Refresh calendar data
      fetchCalendarData();
      
      // Update the popup data
      const studentObj = students.find(s => s.id === parseInt(selectedStudent));
      
      if (studentObj) {
        setDateStudents([
          ...dateStudents,
          {
            student_id: parseInt(selectedStudent),
            student_name: studentObj.name,
            start_time: defaultTime,
            duration_minutes: parseInt(duration),
            feedback_written: false
          }
        ]);
      }
      
      alert('학생이 이 날짜에 추가되었습니다.');
    } catch (error) {
      console.error('Error adding student to date:', error);
      alert('학생을 추가하는데 오류가 발생했습니다.');
    }
  };

  const formatTime = (timeString) => {
    // Just return the time string directly for 24-hour format
    return timeString;
  };

  const getEndTime = (startTimeStr, durationMinutes) => {
    try {
      // Create a date object for today with the given start time
      const today = new Date();
      const startTime = parseISO(`${format(today, 'yyyy-MM-dd')}T${startTimeStr}`);
      
      // Add the duration
      const endTime = addMinutes(startTime, durationMinutes);
      
      // Return formatted time
      return format(endTime, 'HH:mm');
    } catch (error) {
      console.error('Error calculating end time:', error);
      return '';
    }
  };

  const dayOfWeekOptions = [
    { value: 0, label: '월요일' },
    { value: 1, label: '화요일' },
    { value: 2, label: '수요일' },
    { value: 3, label: '목요일' },
    { value: 4, label: '금요일' },
    { value: 5, label: '토요일' },
    { value: 6, label: '일요일' },
  ];

  // Custom tileContent to display indicators for dates with classes
  const tileContent = ({ date: tileDate, view }) => {
    // Only add indicators in month view
    if (view !== 'month') return null;
    
    // Find the date in our calendar data
    const dateStr = format(tileDate, 'yyyy-MM-dd');
    const dateData = calendarData.find(item => item.date === dateStr);
    
    if (!dateData || !dateData.classes.length) return null;
    
    // Count students with and without feedback
    const pendingFeedback = dateData.classes.filter(c => !c.feedback_written && !c.is_absent);
    
    // Return content based on student status
    return (
      <div className="calendar-tile-content">
        {pendingFeedback.length > 0 && (
          <div className="pending-indicator" title={`${pendingFeedback.length}명의 학생 피드백 미작성`}>
            {pendingFeedback.length}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="calendar-wrapper">
      <h2 className="section-title">수업 일정 & 피드백 현황</h2>
      
      <div className="calendar-layout">
        <div className="calendar-view">
          {loading ? (
            <div className="loading">달력 데이터를 불러오는 중...</div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={fetchCalendarData} className="btn-primary">
                다시 시도
              </button>
            </div>
          ) : (
            <>
              <div className="react-calendar-wrapper">
                {/* 
                  토요일부터 시작하는 달력 설정
                  US 타입의 달력은 일요일부터 시작이 기본값이지만,
                  firstDayOfWeek 속성으로 시작 요일을 변경할 수 있습니다.
                */}
                <Calendar 
                  onChange={setDate}
                  value={date}
                  onClickDay={handleDateClick}
                  formatDay={(locale, date) => format(date, 'd')}
                  className="responsive-calendar"
                  tileContent={tileContent}
                  firstDayOfWeek={6}
                />
              </div>
              
              <div className="calendar-legend">
                <div className="legend-item">
                  <span className="legend-marker feedback-written"></span>
                  <span>피드백 작성 완료</span>
                </div>
                <div className="legend-item">
                  <span className="legend-marker feedback-pending"></span>
                  <span>피드백 미작성</span>
                </div>
                <div className="legend-item">
                  <span className="legend-marker student-absent"></span>
                  <span>결석</span>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="schedule-form">
          <h3>정기 수업 추가</h3>
          <div className="form-group">
            <label>학생:</label>
            <select 
              value={selectedStudent} 
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="form-select"
            >
              {students.length > 0 ? (
                students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))
              ) : (
                <option value="">학생 데이터 없음</option>
              )}
            </select>
          </div>
          
          <div className="form-group">
            <label>요일:</label>
            <select 
              value={dayOfWeek} 
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="form-select"
            >
              {dayOfWeekOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>시작 시간 (24시간제):</label>
            <input 
              type="text" 
              value={startTime} 
              onChange={(e) => {
                // Validate and format input for 24-hour time
                const value = e.target.value;
                // Allow only digits and colon in correct format
                if (/^([0-9]{1,2}:?[0-9]{0,2})?$/.test(value)) {
                  setStartTime(value);
                }
              }}
              onBlur={(e) => {
                // Format on blur to ensure HH:MM format
                let value = e.target.value;
                if (value) {
                  // Handle cases where user types only hours
                  if (!value.includes(':')) {
                    value = value.padStart(2, '0') + ':00';
                  } else {
                    // Split and pad both hours and minutes
                    const [hours, minutes] = value.split(':');
                    const paddedHours = hours.padStart(2, '0');
                    const paddedMinutes = (minutes || '00').padStart(2, '0');
                    value = `${paddedHours}:${paddedMinutes}`;
                  }
                  
                  // Validate hours and minutes are in range
                  const [hours, minutes] = value.split(':');
                  if (parseInt(hours) > 23) {
                    value = '23:' + minutes;
                  }
                  if (parseInt(minutes) > 59) {
                    value = hours + ':59';
                  }
                  
                  setStartTime(value);
                }
              }}
              placeholder="15:00"
              className="form-input time-input"
              maxLength={5}
            />
            <small className="form-text text-muted">   24시간제로 입력</small>
          </div>
          
          <div className="form-group">
            <label>수업 시간 (분):</label>
            <input 
              type="number" 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)}
              className="form-input"
              min="15"
              step="15"
            />
          </div>
          
          <button onClick={addScheduledClass} className="btn-primary">
            정기 일정 추가
          </button>
        </div>
      </div>
      
      {/* Date Popup */}
      {showDatePopup && (
        <div className="date-popup-overlay" onClick={() => setShowDatePopup(false)}>
          <div className="date-popup" onClick={(e) => e.stopPropagation()}>
            <div className="date-popup-header">
              <h3>{selectedDate && format(selectedDate, 'yyyy년 MM월 dd일')} 수업</h3>
              <button className="close-button" onClick={() => setShowDatePopup(false)}>×</button>
            </div>
            
            <div className="date-students-list">
              {dateStudents.length > 0 ? (
                dateStudents.map((student, idx) => (
                  <div 
                    key={idx} 
                    className={`date-student-item ${student.feedback_written ? 'feedback-written' : 'feedback-pending'} ${student.is_absent ? 'student-absent' : ''}`}
                    onClick={() => !student.is_absent && goToFeedbackForm(student.student_id, format(selectedDate, 'yyyy-MM-dd'))}
                  >
                    <div className="student-info">
                      <span className="student-name">{student.student_name}</span>
                      <span className="class-time">{formatTime(student.start_time)} - {getEndTime(student.start_time, student.duration_minutes)}</span>
                    </div>
                    {student.feedback_written && (
                      <span className="feedback-check">✓</span>
                    )}
                    {student.is_absent && (
                      <span className="absent-mark">결석</span>
                    )}
                    {!student.feedback_written && !student.is_absent && (
                      <button 
                        className="mark-absent-button" 
                        onClick={() => markStudentAsAbsent(student.student_id, format(selectedDate, 'yyyy-MM-dd'))}
                      >
                        결석 표시
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-students-message">이 날짜에 예약된 수업이 없습니다.</p>
              )}
            </div>
            
            <div className="add-student-section">
              <h4>이 날짜에 학생 추가</h4>
              <div className="add-student-form">
                <div className="form-row">
                  <select 
                    value={selectedStudent} 
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="form-select"
                  >
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                  
                  <button onClick={addStudentToDate} className="btn-primary">
                    추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClassCalendar;
