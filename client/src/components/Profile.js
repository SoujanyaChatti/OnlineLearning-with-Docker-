import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Link } from 'react-router-dom';
import { API_URL } from './config'; // Import the config
const Profile = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');
  const decoded = token ? jwtDecode(token) : null;
  const userId = decoded ? decoded.id : 1;

  useEffect(() => {
    if (token) {
      console.log(`Fetching enrollments for userId: ${userId}, token: ${token.substring(0, 10)}...`);
      axios.get(`${API_URL}/api/courses/enrollments?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          console.log('Enrollment response:', res.data);
          setEnrollments(res.data);
        })
        .catch(err => {
          console.error('Enrollment fetch error:', {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message
          });
          if (err.response && err.response.status === 401) {
            setError('Unauthorized. Please log in again.');
            localStorage.removeItem('token'); // Clear invalid token
          } else {
            setError('Failed to load enrollment data.');
          }
        });
    } else {
      setError('No token found. Please log in.');
    }
  }, [token, userId]);

  const enrolledCourses = enrollments.filter(course => course.progress < 100);
  const completedCourses = enrollments.filter(course => course.progress === 100);

  const handleViewCertificate = (courseId) => {
    console.log('Fetching certificate for:', { userId, courseId });
    axios
      .get(`${API_URL}/api/certificates?user_id=${userId}&course_id=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `certificate_${courseId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error('Certificate fetch error:', err);
        setError('Failed to generate certificate.');
      });
  };

  return (
    <div className="container mt-4 p-4 bg-light rounded shadow-sm">
      <h1 className="mb-3">Profile</h1>
      {error && (
        <div className="alert alert-danger">
          {error}
          {error.includes('log in') && (
            <button
              className="btn btn-primary mt-2"
              onClick={() => window.location.href = '/login'} // Adjust to your login route
            >
              Go to Login
            </button>
          )}
        </div>
      )}
      {!error && (
        <>
          <h2 className="mb-3">Enrolled Courses</h2>
          {enrolledCourses.length === 0 ? (
            <p className="text-center">No enrolled courses.</p>
          ) : (
            <ul className="list-group">
              {enrolledCourses.map(course => (
                <li key={course.id} className="list-group-item">
                  <Link to={`/course-content/${course.course_id}`}>{course.title}</Link>
                  <div className="progress mt-2">
                    <div
                      className="progress-bar"
                      style={{ width: `${course.progress}%` }}
                      role="progressbar"
                      aria-valuenow={course.progress}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      {course.progress}%
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <h2 className="mt-4 mb-3">Completed Courses</h2>
          {completedCourses.length === 0 ? (
            <p className="text-center">No completed courses.</p>
          ) : (
            <ul className="list-group">
              {completedCourses.map(course => (
                <li key={course.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <Link to={`/course-content/${course.course_id}`}>{course.title}</Link> (100% Completed)
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewCertificate(course.course_id)}
                  >
                    View Certificate
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default Profile;
