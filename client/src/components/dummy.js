import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import './CourseContent.css';
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
  const [rating, setRating] = useState(0);
  const [courseRating, setCourseRating] = useState(0);
  const [showForums, setShowForums] = useState(false);
  const [forumPosts, setForumPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');

  const fetchContents = useCallback(
    async (moduleId) => {
      try {
        const res = await axios.get(`${API_URL}/api/modules/${moduleId}/contents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const contentData = res.data;
        console.log(`Content for module ${moduleId}:`, contentData);
        // Check for duplicate IDs
        const ids = contentData.map((item) => item.id);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
          console.warn(`Duplicate content IDs detected for module ${moduleId}:`, ids);
        }
        // Deduplicate by keeping the item with the lowest order_index for each ID
        const uniqueContentData = Array.from(
          new Map(
            contentData
              .sort((a, b) => a.order_index - b.order_index) // Sort to prioritize lower order_index
              .map((item) => [item.id, item])
          ).values()
        );
        setContents((prev) => ({ ...prev, [moduleId]: uniqueContentData }));
        return uniqueContentData;
      } catch (err) {
        setError('Failed to load content for this module.');
        return [];
      }
    },
    [token]
  );

  useEffect(() => {
    if (showForums && courseId && token) {
      axios
        .get(`${API_URL}/api/courses/${courseId}/forum-posts`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setForumPosts(res.data);
        })
        .catch((err) => {
          setError(err.response?.data?.details || 'Failed to load forum posts.');
          setForumPosts([]);
        });
    }
  }, [showForums, courseId, token]);

  useEffect(() => {
    if (token && courseId) {
      axios
        .get(`${API_URL}/api/courses/enrollments?user_id=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const enrollment = res.data.find((e) => e.course_id === parseInt(courseId));
          if (enrollment) {
            setEnrollmentId(enrollment.id);
            setProgress(enrollment.progress || 0);
          } else {
            setError('No enrollment found for this course. Please enroll first.');
          }
        })
        .catch((err) => {
          setError('Failed to load enrollment data.');
        });

      axios
        .get(`${API_URL}/api/courses/${courseId}/modules`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(async (res) => {
          const modulesData = res.data;
          setModules(modulesData);
          if (modulesData.length > 0) {
            const firstModuleId = modulesData[0].id;
            setExpandedModule(firstModuleId);
            const contentData = await fetchContents(firstModuleId);
            if (contentData.length > 0) {
              const firstNonQuizContent = contentData
                .filter((c) => c.type.toLowerCase() !== 'quiz')
                .sort((a, b) => a.order_index - b.order_index)[0];
              setSelectedContent(firstNonQuizContent ? firstNonQuizContent.id : contentData[0].id);
            }
          } else {
            setError('No modules found for this course.');
          }
        })
        .catch((err) => {
          setError('Failed to load modules.');
        });

      axios
        .get(`${API_URL}/api/courses/${courseId}/rating`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const rating = res.data.rating || 0;
          if (typeof rating !== 'number') {
            setCourseRating(0);
          } else {
            setCourseRating(rating);
          }
        })
        .catch((err) => {
          setCourseRating(0);
        });
    }
  }, [token, userId, courseId, fetchContents]);

  useEffect(() => {
    if (enrollmentId && selectedContent && expandedModule && contents[expandedModule]) {
      const content = contents[expandedModule].find((c) => c.id === selectedContent);
      if (content && content.type.toLowerCase() === 'quiz') {
        axios
          .get(`${API_URL}/api/submissions/count`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { enrollmentId, quizId: content.id },
          })
          .then((res) => {
            setAttemptCount(res.data.attemptCount || 0);
          })
          .catch((err) => {
            setAttemptCount(0);
          });

        axios
          .get(`${API_URL}/api/submissions/max-score`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { quizId: content.id },
          })
          .then((res) => {
            setMaxScore(res.data.maxScore || 100);
          })
          .catch((err) => {
            setMaxScore(100);
          });
      } else {
        setAttemptCount(0);
        setMaxScore(100);
      }
    }
  }, [enrollmentId, selectedContent, expandedModule, contents, token]);

  const markAsCompleted = (e) => {
    e.preventDefault();
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
          alert('Failed to update progress.');
        });
    } else {
      alert('Enrollment not found. Please enroll in the course first.');
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setQuizAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const handleQuizSubmit = (e) => {
    e.preventDefault();
    const content = contents[expandedModule].find((c) => c.id === selectedContent);
    if (!content || !content.questions) {
      return;
    }

    const maxAttempts = 3;
    if (attemptCount >= maxAttempts) {
      alert(`Maximum ${maxAttempts} attempts reached.`);
      return;
    }

    if (!enrollmentId) {
      alert('Please enroll in the course first.');
      return;
    }

    let score = 0;
    const totalQuestions = content.questions.length;
    content.questions.forEach((question, qIndex) => {
      const userAnswer = quizAnswers[qIndex];
      if (userAnswer === question.answer) score++;
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
        if (res.data && res.data.attemptCount !== undefined) {
          setAttemptCount(res.data.attemptCount);
        } else {
          setAttemptCount(attemptCount + 1);
        }
        setProgress(res.data.progress || percentageScore);
        alert('Quiz submitted successfully!');
      })
      .catch((err) => {
        alert('Failed to submit quiz. Check console for details.');
      });
  };

  const handleModuleClick = async (e, moduleId) => {
    e.preventDefault();
    const isExpanding = expandedModule !== moduleId;
    setExpandedModule(isExpanding ? moduleId : null);
    setShowForums(false);
    setQuizScore(null);
    setSelectedContent(null);
    if (isExpanding) {
      const contentData = await fetchContents(moduleId);
      if (contentData.length > 0) {
        const firstNonQuizContent = contentData
          .filter((c) => c.type.toLowerCase() !== 'quiz')
          .sort((a, b) => a.order_index - b.order_index)[0];
        setSelectedContent(firstNonQuizContent ? firstNonQuizContent.id : contentData[0].id);
      }
    }
  };

  const handleContentClick = (e, content) => {
    e.preventDefault();
    setSelectedContent(content.id);
    setShowForums(false);
    setQuizScore(null);
    setQuizAnswers({});
    if (content.type.toLowerCase() === 'quiz' && enrollmentId) {
      axios
        .get(`${API_URL}/api/submissions/count`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { enrollmentId, quizId: content.id },
        })
        .then((res) => {
          setAttemptCount(res.data.attemptCount || 0);
        })
        .catch((err) => {
          setAttemptCount(0);
        });

      axios
        .get(`${API_URL}/api/submissions/max-score`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { quizId: content.id },
        })
        .then((res) => {
          setMaxScore(res.data.maxScore || 100);
        })
        .catch((err) => {
          setMaxScore(100);
        });
    }
  };

  const handleRatingSubmit = (e) => {
    e.preventDefault();
    if (rating > 0 && rating <= 5 && enrollmentId) {
      axios
        .post(
          `${API_URL}/api/courses/${courseId}/rate`,
          {
            userId,
            rating,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then((res) => {
          setCourseRating(res.data.averageRating);
          alert('Thank you for rating the course!');
          setRating(0);
        })
        .catch((err) => {
          alert('Failed to submit rating. Check console for details.');
        });
    } else {
      alert('Please select a rating between 1 and 5.');
    }
  };

  const handlePostSubmit = (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) {
      alert('Please enter a post content.');
      return;
    }
    if (!token) {
      alert('Please log in to post.');
      return;
    }

    axios
      .post(
        `${API_URL}/api/courses/${courseId}/forum-posts`,
        {
          userId,
          content: newPostContent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then((res) => {
        setForumPosts([res.data, ...forumPosts]);
        setNewPostContent('');
        alert('Post submitted successfully!');
      })
      .catch((err) => {
        alert('Failed to submit post. Check console for details.');
      });
  };

  const handleUpvote = (postId) => {
    if (!token) {
      alert('Please log in to upvote.');
      return;
    }

    axios
      .patch(
        `${API_URL}/api/courses/${courseId}/forum-posts/${postId}/upvote`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then((res) => {
        setForumPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId ? { ...post, upvotes: res.data.upvotes } : post
          )
        );
      })
      .catch((err) => {
        alert('Failed to upvote. Check console for details.');
      });
  };

  const renderContent = useMemo(() => () => {
    if (error) return <div className="alert alert-danger">{error}</div>;
    if (showForums) {
      return (
        <div className="forum-container">
          <h2>Forum Posts</h2>
          {forumPosts.length === 0 ? (
            <p>No posts yet. Be the first to start a discussion!</p>
          ) : (
            <ul className="forum-posts">
              {forumPosts.map((post) => (
                <li key={post.id} className="forum-post">
                  <p><strong>{post.username}</strong> ({new Date(post.created_at).toLocaleString()})</p>
                  <p>{post.content}</p>
                  <button
                    className="btn btn-link upvote-btn"
                    onClick={() => handleUpvote(post.id)}
                  >
                    👍 {post.upvotes}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handlePostSubmit} className="forum-post-form mt-3">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Write your post here..."
              className="form-control mb-2"
              rows="3"
            ></textarea>
            <button type="submit" className="btn btn-primary">Submit Post</button>
          </form>
        </div>
      );
    }
    if (!selectedContent || !expandedModule || !contents[expandedModule]) {
      return <p className="text-center">Select a content item from the sidebar to view details.</p>;
    }

    const content = contents[expandedModule].find((c) => c.id === selectedContent);
    if (!content) return <div className="alert alert-warning">Content not available.</div>;

    switch (content.type.toLowerCase()) {
      case 'video':
        if (content.url) {
          const isYouTubeUrl = content.url.includes('youtube.com') ||
                              content.url.includes('youtu.be') ||
                              content.url.includes('youtube-nocookie.com');
          if (isYouTubeUrl) {
            let videoId = '';
            if (content.url.includes('youtu.be/')) {
              videoId = content.url.split('youtu.be/')[1].split('?')[0].split('#')[0];
            } else if (content.url.includes('watch?v=')) {
              videoId = content.url.split('watch?v=')[1].split('&')[0].split('#')[0];
            } else if (content.url.includes('embed/')) {
              videoId = content.url.split('embed/')[1].split('?')[0].split('#')[0];
            } else if (content.url.includes('/v/')) {
              videoId = content.url.split('/v/')[1].split('?')[0].split('#')[0];
            }
            if (videoId) {
              const embedUrl = `https://www.youtube.com/embed/${videoId}`;
              return (
                <div>
                  <div className="video-container">
                    <iframe
                      title="YouTube Video"
                      width="100%"
                      height="500"
                      src={embedUrl}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <button className="btn btn-success mt-3 mb-2" onClick={markAsCompleted} disabled={!enrollmentId}>
                    Mark as Completed
                  </button>
                  <p>
                    <strong>Progress:</strong> {progress.toFixed(2)}%
                  </p>
                </div>
              );
            } else {
              return <div className="alert alert-danger">Invalid YouTube URL: Unable to extract video ID</div>;
            }
          } else {
            return (
              <div>
                <video controls className="w-100 mb-3" height="auto">
                  <source src={content.url} type="video/mp4" />
                  <source src={content.url} type="video/webm" />
                  <p>
                    Your browser does not support the video format.{' '}
                    <a href={content.url} target="_blank" rel="noopener noreferrer">
                      Download the video
                    </a>{' '}
                    or try a different browser.
                  </p>
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
        } else {
          return <div className="alert alert-warning">No video URL provided</div>;
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
        return (
          <div>
            <h4>Quiz (Attempts left: {Math.max(0, 3 - attemptCount)})</h4>
            <p>Max Score: {maxScore}</p>
            {content.questions && content.questions.length > 0 ? (
              <>
                {content.questions.map((question, qIndex) => (
                  <div key={`${content.id}-q-${qIndex}`} className="quiz-question">
                    <p>{question.question}</p>
                    {question.options && question.options.length > 0 ? (
                      question.options.map((option, index) => (
                        <div key={`${content.id}-q-${qIndex}-o-${index}`}>
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
  }, [error, showForums, selectedContent, expandedModule, contents, enrollmentId, progress, quizScore, attemptCount, maxScore, forumPosts, newPostContent, token, userId, markAsCompleted, handleQuizSubmit, handleAnswerChange]);

  const memoizedRenderContent = renderContent();

  return (
    <div className="course-content">
      <nav className="navbar">
        <div className="navbar-brand">Online Learning Platform</div>
        <ul className="navbar-menu">
          <li className="navbar-item">
            <Link to="/student">Dashboard</Link>
          </li>
          <li className="navbar-item">
            <Link to="/profile">Profile</Link>
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
                  onClick={(e) => handleModuleClick(e, module.id)}
                >
                  {module.title} {expandedModule === module.id ? '▼' : '▶️'}
                </h5>
                {expandedModule === module.id && contents[module.id] && contents[module.id].length > 0 ? (
  <ul className="content-list">
    {contents[module.id]
      .sort((a, b) => a.order_index - b.order_index) // Sort by order_index
      .map((content, index) => (
        <li
          key={`${content.id}-${index}`} // Use composite key to handle duplicates
          className={`content-item ${selectedContent === content.id ? 'selected' : ''}`}
          onClick={(e) => handleContentClick(e, content)}
        >
          {content.type}: {content.url ? content.url.split('/').pop() : 'Unnamed Content'}
        </li>
      ))}
  </ul>
) : (
  expandedModule === module.id && <p className="text-center">No content available.</p>
)}
              </div>
            ))
          )}
          <button
            className="forums-button"
            onClick={() => {
              setShowForums(!showForums);
              setSelectedContent(null);
              setQuizScore(null);
            }}
          >
            {showForums ? 'Hide Forums' : 'Show Forums'}
          </button>
          <div className="rating-section mt-3">
            <h5>Rate this Course</h5>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= rating ? 'selected' : ''}`}
                  onClick={() => setRating(star)}
                >
                  ★
                </span>
              ))}
            </div>
            <p>Average Rating: {typeof courseRating === 'number' ? courseRating.toFixed(1) : 'N/A'}</p>
            <button className="btn btn-primary mt-2" onClick={handleRatingSubmit} disabled={rating === 0}>
              Submit Rating
            </button>
          </div>
        </div>
        <div className="main-content">{memoizedRenderContent}</div>
      </div>
    </div>
  );
};

export default CourseContent;