import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './InstructorDashboard.css';
import { API_URL } from './config'; // Import the config

const InstructorDashboard = () => {
  const [view, setView] = useState('myCourses'); // 'myCourses' or 'createCourse'
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'Beginner',
    modules: [
      { title: '', description: '', order_index: 1, contents: [], quiz: { questions: [], passing_score: 70 } },
    ],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Debug log to track component re-renders
  console.log('InstructorDashboard rendering, view:', view);

  // Safely decode token ID
  const tokenId = React.useMemo(() => {
    if (!token) {
      console.error('No token found');
      return null;
    }
    try {
      const [header, payload, signature] = token.split('.');
      if (!payload) throw new Error('Invalid token format');
      const decodedPayload = JSON.parse(atob(payload));
      console.log('Decoded payload:', decodedPayload);
      return decodedPayload.id || decodedPayload.sub; // Use 'sub' if 'id' isn't the field
    } catch (e) {
      console.error('Invalid token parsing:', e);
      return null;
    }
  }, [token]);

  // Debug effect to monitor token/tokenId
  useEffect(() => {
    console.log('Token available:', !!token);
    console.log('TokenId parsed:', tokenId);
  }, [token, tokenId]);

  // Effect to fetch courses when tokenId is available
  useEffect(() => {
    if (tokenId) {
      console.log('TokenId available, fetching courses');
      fetchCourses();
    } else {
      console.warn('No tokenId available, cannot fetch courses');
    }
  }, [tokenId]);

  // Debug effect to monitor courses state
  useEffect(() => {
    console.log('Current courses state:', courses);
  }, [courses]);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    
    if (!tokenId) {
      setError('User ID not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      console.log(`Fetching courses for instructor ID: ${tokenId} with token: ${token.substring(0, 10)}...`);
      
    const response = await axios.get(`${API_URL}/api/courses/instructor/${tokenId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Raw courses response:', response);
      if (Array.isArray(response.data)) {
        setCourses(response.data);
        console.log(`Successfully loaded ${response.data.length} courses`);
      } else if (response.data && response.data.courses && Array.isArray(response.data.courses)) {
        setCourses(response.data.courses);
        console.log(`Successfully loaded ${response.data.courses.length} courses`);
      } else {
        console.error('Unexpected response format:', response.data);
        setError('Invalid data format from server');
        setCourses([]);
      }
    } catch (err) {
      console.error('Detailed fetch error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(`Failed to load courses: ${err.response?.data?.message || err.message}`);
      setCourses([]);
      // Remove mock data for now to focus on real data
      // setCourses([...]); // Commented out for debugging
    } finally {
      setLoading(false);
    }
  };
  const handleCourseChange = (e) => {
    setCourseData({ ...courseData, [e.target.name]: e.target.value });
  };

  const handleModuleChange = (index, e) => {
    const newModules = [...courseData.modules];
    newModules[index][e.target.name] = e.target.value;
    setCourseData({ ...courseData, modules: newModules });
  };

  const handleContentChange = (moduleIndex, contentIndex, e) => {
    const newModules = [...courseData.modules];
    newModules[moduleIndex].contents[contentIndex] = {
      ...newModules[moduleIndex].contents[contentIndex],
      [e.target.name]: e.target.value,
    };
    setCourseData({ ...courseData, modules: newModules });
  };

  const handleQuizChange = (moduleIndex, qIndex, e) => {
    const newModules = [...courseData.modules];
    if (!newModules[moduleIndex].quiz.questions[qIndex]) {
      newModules[moduleIndex].quiz.questions[qIndex] = {};
    }
    newModules[moduleIndex].quiz.questions[qIndex][e.target.name] = e.target.value;
    setCourseData({ ...courseData, modules: newModules });
  };

  const addModule = () => {
    setCourseData({
      ...courseData,
      modules: [
        ...courseData.modules,
        { title: '', description: '', order_index: courseData.modules.length + 1, contents: [], quiz: { questions: [], passing_score: 70 } },
      ],
    });
  };

  const addContent = (moduleIndex) => {
    const newModules = [...courseData.modules];
    newModules[moduleIndex].contents.push({ type: 'video', url: '', duration: '', order_index: 1 });
    setCourseData({ ...courseData, modules: newModules });
  };

  const addQuestion = (moduleIndex) => {
    const newModules = [...courseData.modules];
    newModules[moduleIndex].quiz.questions.push({ question: '', options: ['', '', ''], answer: '' });
    setCourseData({ ...courseData, modules: newModules });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const isValid = courseData.title && courseData.description && courseData.category &&
      courseData.modules.every(m => m.title &&
        m.contents.every(c => c.type && c.url && (c.type === 'video' ? c.duration : true)) &&
        m.quiz && m.quiz.passing_score && m.quiz.questions.every(q => q.question && q.options.length > 0 && q.answer));
    if (!isValid) {
      setError('Please fill in all required fields, including content URLs and quiz details.');
      setLoading(false);
      return;
    }
    console.log('Request body:', JSON.stringify({ ...courseData }, null, 2));
    try {
      const response = await axios.post(`${API_URL}/api/courses/create`, courseData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Success response:', response.data);
      alert(response.data.message);
      setCourseData({
        title: '',
        description: '',
        category: '',
        difficulty: 'Beginner',
        modules: [{ title: '', description: '', order_index: 1, contents: [], quiz: { questions: [], passing_score: 70 } }],
      });
      setView('myCourses');
      fetchCourses();
    } catch (err) {
      console.error('Course creation error:', err.response ? err.response.data : err.message);
      setError('Failed to create course: ' + (err.response ? err.response.data.error : err.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      setLoading(true);
      try {
        await axios.delete(`${API_URL}/api/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchCourses();
        alert('Course deleted successfully!');
      } catch (err) {
        console.error('Error deleting course:', err);
        setError('Failed to delete course.');
      } finally {
        setLoading(false);
      }
    }
  };

  const manageCourse = async (course) => {
    console.log('Managing course:', course);
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/api/courses/${course.id}/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Module data received:', response.data);
      setSelectedCourse({ ...course, modules: response.data });
    } catch (err) {
      console.error('Error fetching course modules:', err.response ? err.response.data : err.message);
      setError(`Failed to load modules for ${course.title}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="instructor-dashboard">
      <h1 className="text-center mb-4">Instructor Dashboard</h1>
      <div className="btn-group mb-4" role="group">
        <button
          className={`btn ${view === 'myCourses' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setView('myCourses')}
        >
          My Courses
        </button>
        <button
          className={`btn ${view === 'createCourse' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setView('createCourse')}
        >
          Create New Course
        </button>
      </div>

      {loading && <div className="alert alert-info">Loading...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {view === 'myCourses' && (
        <div>
          <h2>My Courses</h2>
          {courses.length === 0 ? (
            <div className="alert alert-warning">
              <p>No courses found. {tokenId ? '' : 'User ID not available - please log in again.'}</p>
              <button className="btn btn-primary" onClick={fetchCourses}>Refresh Courses</button>
            </div>
          ) : (
            <div>
              <p>Found {courses.length} course(s)</p>
              <ul className="list-group course-list">
                {courses.map((course) => (
                  <li 
                    key={course.id} 
                    className="list-group-item d-flex justify-content-between align-items-center course-item"
                    style={{ border: '1px solid #ddd', marginBottom: '8px', padding: '10px' }}
                  >
                    <div>
                      <strong>{course.title}</strong> 
                      <span className="ms-2 badge bg-secondary">{course.category}</span>
                      <span className="ms-2 badge bg-info">{course.difficulty}</span>
                    </div>
                    <div>
                      <button className="btn btn-info btn-sm me-2" onClick={() => manageCourse(course)}>
                        Manage
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteCourse(course.id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selectedCourse && (
            <div className="mt-4 selected-course-container" style={{ padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
              <h3>Manage Course: {selectedCourse.title}</h3>
              <button className="btn btn-secondary mb-2" onClick={() => setSelectedCourse(null)}>
                Back to Courses
              </button>
              {selectedCourse.modules && selectedCourse.modules.length > 0 ? (
                <ul className="list-group">
                  {selectedCourse.modules.map((module, index) => (
                    <li key={index} className="list-group-item">
                      <strong>{module.title}</strong> - {module.description}
                      <div className="mt-2">
                        <button className="btn btn-warning btn-sm me-2" onClick={() => {/* Implement edit module */}}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => {/* Implement delete module */}}>
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No modules available for this course.</p>
              )}
              <button className="btn btn-success mt-3" onClick={() => {/* Implement add module */}}>
                Add Module
              </button>
            </div>
          )}
        </div>
      )}


      {view === 'createCourse' && (
        <div>
          <h2>Create New Course</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title:</label>
              <input name="title" value={courseData.title} onChange={handleCourseChange} required />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea name="description" value={courseData.description} onChange={handleCourseChange} />
            </div>
            <div className="form-group">
              <label>Category:</label>
              <input name="category" value={courseData.category} onChange={handleCourseChange} />
            </div>
            <div className="form-group">
              <label>Difficulty:</label>
              <select name="difficulty" value={courseData.difficulty} onChange={handleCourseChange}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            {courseData.modules.map((module, moduleIndex) => (
              <div key={moduleIndex} className="module-section">
                <h3>Module {moduleIndex + 1}</h3>
                <div className="form-group">
                  <label>Title:</label>
                  <input name="title" value={module.title} onChange={(e) => handleModuleChange(moduleIndex, e)} required />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <textarea name="description" value={module.description} onChange={(e) => handleModuleChange(moduleIndex, e)} />
                </div>
                <div className="form-group">
                  <label>Order Index:</label>
                  <input type="number" name="order_index" value={module.order_index} onChange={(e) => handleModuleChange(moduleIndex, e)} />
                </div>
                <h4>Contents</h4>
                {module.contents.map((content, contentIndex) => (
                  <div key={contentIndex} className="content-section">
                    <div className="form-group">
                      <label>Type:</label>
                      <select name="type" value={content.type} onChange={(e) => handleContentChange(moduleIndex, contentIndex, e)}>
                        <option value="video">Video (e.g., YouTube link)</option>
                        <option value="PDF">PDF (provide a downloadable link)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>URL:</label>
                      <input name="url" placeholder="Enter downloadable URL" value={content.url} onChange={(e) => handleContentChange(moduleIndex, contentIndex, e)} required />
                    </div>
                    {content.type === 'video' && (
                      <div className="form-group">
                        <label>Duration (e.g., 5m):</label>
                        <input name="duration" placeholder="Duration (e.g., 5m)" value={content.duration} onChange={(e) => handleContentChange(moduleIndex, contentIndex, e)} />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Order Index:</label>
                      <input type="number" name="order_index" value={content.order_index} onChange={(e) => handleContentChange(moduleIndex, contentIndex, e)} />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add" onClick={() => addContent(moduleIndex)}>
                  Add Content
                </button>
                <h4>Quiz</h4>
                <div className="form-group">
                  <label>Passing Score:</label>
                  <input type="number" name="passing_score" value={module.quiz.passing_score} onChange={(e) => handleQuizChange(moduleIndex, 0, e)} placeholder="Passing Score" />
                </div>
                {module.quiz.questions.map((q, qIndex) => (
                  <div key={qIndex} className="quiz-section">
                    <div className="form-group">
                      <label>Question:</label>
                      <input name="question" value={q.question} onChange={(e) => handleQuizChange(moduleIndex, qIndex, e)} placeholder="Question" />
                    </div>
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className="form-group">
                        <label>Option {optIndex + 1}:</label>
                        <input name="options" value={opt} onChange={(e) => {
                          const newModules = [...courseData.modules];
                          newModules[moduleIndex].quiz.questions[qIndex].options[optIndex] = e.target.value;
                          setCourseData({ ...courseData, modules: newModules });
                        }} placeholder={`Option ${optIndex + 1}`} />
                      </div>
                    ))}
                    <div className="form-group">
                      <label>Correct Answer:</label>
                      <input name="answer" value={q.answer} onChange={(e) => handleQuizChange(moduleIndex, qIndex, e)} placeholder="Correct Answer" />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add" onClick={() => addQuestion(moduleIndex)}>
                  Add Question
                </button>
              </div>
            ))}
            <button type="button" className="btn-add" onClick={addModule}>
              Add Module
            </button>
            <button type="submit" className={`btn-submit ${loading ? 'disabled' : ''}`} disabled={loading}>
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default InstructorDashboard;
