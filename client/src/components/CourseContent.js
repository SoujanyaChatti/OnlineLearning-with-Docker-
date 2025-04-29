import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import './CourseContent.css'; // Custom CSS file
import { API_URL } from './config';

const CourseContent = () => {
  const { id: courseId } = useParams();
  const [modules, setModules] = useState([]);
  const [contents, setContents] = useState({});
  const [expandedModule, setExpandedModule] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const token = localStorage.getItem('token');
  const decoded = token ? jwtDecode(token) : null;
  const userId = decoded ? decoded.id : 1;
  const [enrollmentId, setEnrollmentId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const fetchContents = useCallback(
    (moduleId) => {
      console.log(`Fetching contents for moduleId: ${moduleId}`);
      return axios
        .get(`${API_URL}/api/modules/${moduleId}/contents`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log('Contents response (raw):', res.data);
          const contentData = res.data;
          setContents((prev) => ({ ...prev, [moduleId]: contentData }));
          const firstNonQuizContent = contentData
            .filter((c) => c.type.toLowerCase() !== 'quiz')
            .sort((a, b) => a.order_index - b.order_index)[0];
          const newSelectedContent = firstNonQuizContent
            ? firstNonQuizContent.id
            : contentData[0]?.id || null;
          if (newSelectedContent !== selectedContent) {
            setSelectedContent(newSelectedContent);
          }
          return contentData;
        })
        .catch((err) => {
          console.error('Content fetch error:', err.response ? err.response.data : err.message);
          setError('Failed to load content.');
          setSelectedContent(null);
        });
    },
    [token, selectedContent]
  );

  useEffect(() => {
    if (token && courseId) {
      axios
        .get(`${API_URL}/api/courses/enrollments?user_id=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log('Enrollment response:', res.data);
          const enrollment = res.data.find((e) => e.course_id === parseInt(courseId));
          if (enrollment) {
            setEnrollmentId(enrollment.id);
            setProgress(enrollment.progress || 0);
          } else {
            setError('No enrollment found for this course.');
          }
        })
        .catch((err) => {
          console.error('Enrollment fetch error:', err.response ? err.response.data : err.message);
          setError('Failed to load enrollment data.');
        });

      axios
        .get(`${API_URL}/api/courses/${courseId}/modules`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log('Modules response:', res.data);
          const modulesData = res.data;
          setModules(modulesData);
          if (modulesData.length > 0) {
            const firstModuleId = modulesData[0].id;
            setExpandedModule(firstModuleId);
            fetchContents(firstModuleId);
          } else {
            setError('No modules found for this course.');
          }
        })
        .catch((err) => {
          console.error('Modules fetch error:', err.response ? err.response.data : err.message);
          setError('Failed to load modules.');
        });
    }
  }, [token, userId, courseId, fetchContents]);

  useEffect(() => {
    if (enrollmentId && selectedContent && contents[expandedModule]) {
      const content = contents[expandedModule].find((c) => c.id === selectedContent);
      if (content && content.type.toLowerCase() === 'quiz') {
        axios
          .get(`${API_URL}/api/submissions/count`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { enrollmentId, quizId: content.id },
          })
          .then((res) => {
            console.log('Attempt count response:', res.data);
            setAttemptCount(res.data.attemptCount || 0);
          })
          .catch((err) => {
            console.error('Attempt count fetch error:', err.response ? err.response.data : err.message);
            setAttemptCount(0);
          });

        axios
          .get(`${API_URL}/api/submissions/max-score`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { quizId: content.id },
          })
          .then((res) => {
            console.log('Max score response:', res.data);
            setMaxScore(res.data.maxScore || 100);
          })
          .catch((err) => {
            console.error('Max score fetch error:', err.response ? err.response.data : err.message);
            setMaxScore(100);
          });
      } else {
        setAttemptCount(0);
        setMaxScore(100);
      }
    }
  }, [enrollmentId, selectedContent, expandedModule, contents, token]);

  const markAsCompleted = () => {
    if (selectedContent && enrollmentId) {
      axios
        .post(
          `${API_URL}/api/courses/enrollments/${enrollmentId}/progress`,
          {
            moduleId: expandedModule,
            contentId: selectedContent,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => {
          setProgress(res.data.progress);
          alert('Progress updated!');
        })
        .catch((err) => {
          console.error('Progress update error:', err.response ? err.response.data : err.message);
          alert('Failed to update progress.');
        });
    } else {
      alert('Enrollment not found. Please enroll in the course first.');
    }
  };
  

  const handleAnswerChange = (questionIndex, answer) => {
    console.log('Answer changed:', { questionIndex, answer });
    setQuizAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const handleQuizSubmit = () => {
    const content = contents[expandedModule].find((c) => c.type.toLowerCase() === 'quiz');
    if (!content || !content.questions) {
      console.log('No quiz or questions found:', content);
      return;
    }

    const maxAttempts = 3;
    if (attemptCount >= maxAttempts) {
      alert(`Maximum ${maxAttempts} attempts reached.`);
      return;
    }

    if (!enrollmentId) {
      console.error('No enrollmentId found for submission');
      alert('Please enroll in the course first.');
      return;
    }

    let score = 0;
    const totalQuestions = content.questions.length;
    content.questions.forEach((question, qIndex) => {
      const userAnswer = quizAnswers[qIndex];
      console.log(`Evaluating question ${qIndex}: User answer=${userAnswer}, Correct answer=${question.answer}`);
      if (userAnswer === question.answer) score++;
      else if (userAnswer === undefined) console.log('No answer selected for question:', qIndex);
    });
    const percentageScore = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
    setQuizScore(percentageScore);

    axios
      .post(
        `${API_URL}/api/submissions`,
        {
          enrollmentId,
          quizId: content.id,
          userId,
          score: percentageScore,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then((res) => {
        console.log('Submission response:', res.data);
        if (res.data && res.data.attemptCount !== undefined) {
          setAttemptCount(res.data.attemptCount);
        } else {
          setAttemptCount(attemptCount + 1);
        }
        setProgress(res.data.progress || percentageScore);
        alert('Quiz submitted successfully!');
      })
      .catch((err) => {
        console.error('Submission error:', err.response ? err.response.data : err.message);
        alert('Failed to submit quiz. Check console for details.');
      });
  };

  const renderContent = () => {
    if (error) return <div className="alert alert-danger">{error}</div>;
    if (!selectedContent || !contents[expandedModule]) return <p className="text-center">Select a content item to view details.</p>;

    const content = contents[expandedModule].find((c) => c.id === selectedContent);
    if (!content) return <div className="alert alert-warning">Content not available.</div>;

    switch (content.type.toLowerCase()) {
      case 'video':
        console.log('Rendering video content:', { url: content.url, type: content.type });
        const isYouTubeUrl = content.url.includes('youtube.com/watch') || content.url.includes('youtu.be');
        if (isYouTubeUrl) {
          const videoId = content.url.match(/[?&]v=([^&]+)/)?.[1] || content.url.split('/').pop();
          const embedUrl = `https://www.youtube.com/embed/${videoId}`;
          return (
            <div>
              <iframe
                title="YouTube Video"
                width="100%"
                height="315"
                src={embedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={(e) => console.error('Iframe error:', e)}
              ></iframe>
              <button className="btn btn-success mb-2" onClick={markAsCompleted} disabled={!enrollmentId}>
                Mark as Completed
              </button>
              <p>
                <strong>Progress:</strong> {progress.toFixed(2)}%
              </p>
            </div>
          );
        } else {
          return (
            <div>
              <video controls className="w-100 mb-3" height="auto" onError={(e) => console.error('Video error:', e.target.error)}>
                {content.url && (
                  <>
                    <source src={content.url} type="video/mp4" />
                    <source src={content.url} type="video/webm" />
                    <p>
                      Your browser does not support the video format.{' '}
                      <a href={content.url} target="_blank" rel="noopener noreferrer">
                        Download the video
                      </a>{' '}
                      or try a different browser.
                    </p>
                  </>
                )}
              </video>
              <button className="btn btn-success mb-2" onClick={markAsCompleted} disabled={!enrollmentId}>
                Mark as Completed
              </button>
              <p>
                <strong>Progress:</strong> {progress.toFixed(2)}%
              </p>
            </div>
          );
        }
      case 'pdf':
        return (
          <div>
            <iframe src={content.url} className="w-100" height="600px" title="PDF Viewer">
              <p>
                Your browser does not support PDFs.{' '}
                <a href={content.url} target="_blank" rel="noopener noreferrer">
                  Download the PDF
                </a>
                .
              </p>
            </iframe>
            <button className="btn btn-success mb-2" onClick={markAsCompleted} disabled={!enrollmentId}>
              Mark as Completed
            </button>
            <p>
              <strong>Progress:</strong> {progress.toFixed(2)}%
            </p>
          </div>
        );
      case 'quiz':
        console.log('Rendering quiz:', content);
        return (
          <div>
            <h4>Quiz (Attempts left: {Math.max(0, 3 - attemptCount)})</h4>
            <p>Max Score: {maxScore}</p>
            {content.questions && content.questions.length > 0 ? (
              <>
                {content.questions.map((question, qIndex) => (
                  <div key={qIndex} className="quiz-question">
                    <p>{question.question}</p>
                    {question.options && question.options.length > 0 ? (
                      question.options.map((option, index) => (
                        <div key={index}>
                          <input
                            type="radio"
                            id={`q_${qIndex}_o_${index}`}
                            name={`question_${qIndex}`}
                            value={option}
                            onChange={(e) => handleAnswerChange(qIndex, e.target.value)}
                            checked={quizAnswers[qIndex] === option}
                          />
                          <label htmlFor={`q_${qIndex}_o_${index}`}>{option}</label>
                        </div>
                      ))
                    ) : (
                      <p className="alert alert-warning">No options available for this question.</p>
                    )}
                  </div>
                ))}
                <button className="btn btn-primary mt-3" onClick={handleQuizSubmit} disabled={attemptCount >= 3}>
                  Submit Quiz
                </button>
                {quizScore !== null && (
                  <div className="mt-3">
                    <h5>Score: {quizScore.toFixed(2)}%</h5>
                    <button className="btn btn-success mb-2" onClick={markAsCompleted} disabled={!enrollmentId}>
                      Mark as Completed
                    </button>
                    <p>
                      <strong>Progress:</strong> {progress.toFixed(2)}%
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="alert alert-warning">No questions available for this quiz.</p>
            )}
          </div>
        );
      default:
        return (
          <div>
            <p>
              Unsupported content type: {content.type}. URL:{' '}
              <a href={content.url} target="_blank" rel="noopener noreferrer">
                {content.url}
              </a>
            </p>
            <button className="btn btn-success mb-2" onClick={markAsCompleted} disabled={!enrollmentId}>
              Mark as Completed
            </button>
            <p>
              <strong>Progress:</strong> {progress.toFixed(2)}%
            </p>
          </div>
        );
    }
  };

  return (
    <div className="course-content">
      <nav className="navbar">
        <div className="navbar-brand">Online Learning Platform</div>
        <ul className="navbar-menu">
          <li className="navbar-item">
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li className="navbar-item">
            <Link to="/profile">Profile</Link>
          </li>
          <li className="navbar-item">
            <Link to="/courses">Courses</Link>
          </li>
          <li className="navbar-item">
            <Link to="/forums">Forums</Link>
          </li>
        </ul>
      </nav>

      <div className="content-layout">
        <div className="sidebar">
          {modules.length === 0 ? (
            <p className="text-center">Loading modules...</p>
          ) : (
            modules.map((module) => (
              <div key={module.id}>
                <h5
                  className="module-title"
                  onClick={(e) => {
                    e.preventDefault(); // Prevent any default behavior (e.g., reload)
                    const isExpanding = expandedModule !== module.id;
                    setExpandedModule(isExpanding ? module.id : null);
                    if (isExpanding) {
                      fetchContents(module.id);
                    } else {
                      setSelectedContent(null);
                    }
                  }}
                >
                  {module.title} {expandedModule === module.id ? '▼' : '▶'}
                </h5>
                {expandedModule === module.id && contents[module.id] && (
                  <ul className="content-list">
                    {contents[module.id].map((content) => (
                      <li
                        key={content.id}
                        className={`content-item ${selectedContent === content.id ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.preventDefault(); // Prevent any default behavior
                          setSelectedContent(content.id);
                          if (content.type.toLowerCase() === 'quiz' && enrollmentId) {
                            axios
                              .get(`${API_URL}/api/submissions/count`, {
                                headers: { Authorization: `Bearer ${token}` },
                                params: { enrollmentId, quizId: content.id },
                              })
                              .then((res) => {
                                console.log('Attempt count response:', res.data);
                                setAttemptCount(res.data.attemptCount || 0);
                              })
                              .catch((err) => {
                                console.error('Attempt count fetch error:', err.response ? err.response.data : err.message);
                                setAttemptCount(0);
                              });

                            axios
                              .get(`${API_URL}/api/submissions/max-score`, {
                                headers: { Authorization: `Bearer ${token}` },
                                params: { quizId: content.id },
                              })
                              .then((res) => {
                                console.log('Max score response:', res.data);
                                setMaxScore(res.data.maxScore || 100);
                              })
                              .catch((err) => {
                                console.error('Max score fetch error:', err.response ? err.response.data : err.message);
                                setMaxScore(100);
                              });
                          }
                        }}
                      >
                        {content.type}: {content.url.split('/').pop() || 'Unnamed Content'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
          <button className="forums-button">
            <Link to="/forums">Forums</Link>
          </button>
        </div>
        <div className="main-content">{renderContent()}</div>
      </div>
    </div>
  );
};

export default CourseContent;
