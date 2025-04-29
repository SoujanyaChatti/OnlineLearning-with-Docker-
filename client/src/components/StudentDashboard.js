import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { API_URL } from './config';
const StudentDashboard = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [newestCourses, setNewestCourses] = useState([]);
  const [topRatedCourses, setTopRatedCourses] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [studentName, setStudentName] = useState('Student'); // Placeholder
  const [filters, setFilters] = useState({ difficulty: '', rating: '', category: '' });
  const [hasFetchedRecommendations, setHasFetchedRecommendations] = useState(false); // Prevent retry
  const token = localStorage.getItem('token');
  const decoded = token ? jwtDecode(token) : null;
  const userId = decoded ? decoded.id : null;
  console.log('User ID from token:', userId);

  useEffect(() => {
    if (token) {
      console.log('Fetching enrolled courses for userId:', userId);
      axios
        .get(`${API_URL}/api/courses/enrollments?user_id=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log('Raw enrollment data:', res.data);
          const courses = res.data.map((enrollment) => ({
            id: enrollment.course_id,
            title: enrollment.title || `Course ${enrollment.course_id}`,
            progress: enrollment.progress || Math.floor(Math.random() * 100),
            category: enrollment.category || 'tech', // Ensure category is present
          }));
          console.log('Processed enrolled courses:', courses);
          setEnrolledCourses(courses);

          if (!hasFetchedRecommendations) {
            const categories = [...new Set(courses.map((c) => c.category))];
            if (categories.length > 0) {
              axios
                .get(`${API_URL}/api/courses/recommend-by-interest?user_id=${userId}&categories=${categories.join(',')}&limit=3`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                .then((res) => {
                  console.log('Raw interest-based recommendations:', res.data);
                  // Ensure data structure matches expected fields
                  const formattedRecommendations = res.data.map((course) => ({
                    id: course.id,
                    title: course.title,
                    difficulty: course.difficulty || 'N/A',
                    rating: course.rating || 0,
                    category: course.category || 'tech',
                  }));
                  console.log('Formatted recommendations:', formattedRecommendations);
                  setRecommendedCourses(formattedRecommendations);
                })
                .catch((err) => {
                  console.error('Interest-based recommendations fetch error:', err);
                  setRecommendedCourses([
                    { id: 7, title: 'Suggested Course 1', difficulty: 'intermediate', rating: 4.5, category: categories[0] },
                    { id: 8, title: 'Suggested Course 2', difficulty: 'beginner', rating: 4.2, category: categories[0] },
                  ]);
                })
                .finally(() => setHasFetchedRecommendations(true));
            }
          }
        })
        .catch((err) => {
          console.error('Enrollment fetch error:', err);
          setEnrolledCourses([{ id: 1, title: 'Sample Course 1', progress: 50 }, { id: 2, title: 'Sample Course 2', progress: 75 }]);
        });

      console.log('Fetching newest courses');
      axios
        .get(`${API_URL}/api/courses/recent`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log('Raw newest courses data:', res.data);
          const formattedNewest = res.data.map((course) => ({
            id: course.id,
            title: course.title,
            difficulty: course.difficulty || 'N/A',
            rating: course.rating || 0,
            category: course.category || 'tech',
          }));
          setNewestCourses(formattedNewest);
        })
        .catch((err) => {
          console.error('Newest courses fetch error:', err);
          setNewestCourses([
            { id: 3, title: 'New Course 1', difficulty: 'beginner', rating: 4.5, category: 'tech' },
            { id: 4, title: 'New Course 2', difficulty: 'advanced', rating: 4, category: 'business' },
          ]);
        });

      console.log('Fetching top-rated courses');
      axios
        .get(`${API_URL}/api/courses/top-rated`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          console.log('Raw top-rated courses data:', res.data);
          const formattedTopRated = res.data.map((course) => ({
            id: course.id,
            title: course.title,
            difficulty: course.difficulty || 'N/A',
            rating: course.rating || 0,
            category: course.category || 'tech',
          }));
          setTopRatedCourses(formattedTopRated);
        })
        .catch((err) => {
          console.error('Top-rated courses fetch error:', err);
          setTopRatedCourses([
            { id: 5, title: 'Top Rated Course 1', difficulty: 'intermediate', rating: 5, category: 'tech' },
            { id: 6, title: 'Top Rated Course 2', difficulty: 'beginner', rating: 4.8, category: 'design' },
          ]);
        });

      setAnnouncements(['New course: Introduction to AI launches next week!', 'Quiz deadline extended for Module 2.']);
    }
  }, [token, userId, hasFetchedRecommendations]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      const newFilters = { ...prev, [name]: value };
      console.log('Applied filters:', newFilters);
      const allCourses = [...newestCourses, ...topRatedCourses];
      const filteredCourses = allCourses.filter((course) => {
        const ratingMatch = !newFilters.rating || (course.rating && parseFloat(course.rating) >= parseFloat(newFilters.rating));
        const difficultyMatch = !newFilters.difficulty || (course.difficulty && course.difficulty.toLowerCase() !== 'n/a' && course.difficulty.toLowerCase() === newFilters.difficulty.toLowerCase());
        const categoryMatch = !newFilters.category || (course.category && course.category.toLowerCase() === newFilters.category.toLowerCase());
        console.log('Filtering course:', course, 'Matches:', { ratingMatch, difficultyMatch, categoryMatch });
        return ratingMatch && difficultyMatch && categoryMatch;
      });
      console.log('Filtered recommended courses:', filteredCourses);
      setRecommendedCourses(filteredCourses.slice(0, 3));
      return newFilters;
    });
  };
  
  const applyFiltersToCourses = (courses) => {
    console.log('Applying filters to courses:', filters);
    return courses.filter((course) => {
      const ratingMatch = !filters.rating || (course.rating && parseFloat(course.rating) >= parseFloat(filters.rating));
      const difficultyMatch = !filters.difficulty || (course.difficulty && course.difficulty.toLowerCase() !== 'n/a' && course.difficulty.toLowerCase() === filters.difficulty.toLowerCase());
      const categoryMatch = !filters.category || (course.category && course.category.toLowerCase() === filters.category.toLowerCase());
      console.log('Filtering course:', course, 'Matches:', { ratingMatch, difficultyMatch, categoryMatch });
      return ratingMatch && difficultyMatch && categoryMatch;
    });
  };

  const isEnrolled = (courseId) => {
    return enrolledCourses.some((course) => course.id === courseId);
  };

  return (
    <div className="min-vh-100 p-4" style={{ backgroundImage: 'url(/background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div className="container bg-white bg-opacity-90 p-4 rounded shadow-sm">
        <h1 className="text-center mb-4">Welcome, {studentName}!</h1>
        <p className="text-center mb-4 text-muted">Stay on track with your learning journey!</p>

        {/* Filters Section */}
        <div className="mb-4">
          <h3 className="mb-3">Filter Courses</h3>
          <div className="row g-2">
            <div className="col-md-4">
              <select className="form-select" name="difficulty" value={filters.difficulty} onChange={handleFilterChange}>
                <option value="">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="col-md-4">
              <select className="form-select" name="rating" value={filters.rating} onChange={handleFilterChange}>
                <option value="">All Ratings</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5</option>
              </select>
            </div>
            <div className="col-md-4">
              <select className="form-select" name="category" value={filters.category} onChange={handleFilterChange}>
                <option value="">All Categories</option>
                <option value="tech">Technology</option>
                <option value="design">Design</option>
                <option value="business">Business</option>
              </select>
            </div>
          </div>
        </div>

        {/* My Courses Section */}
        {enrolledCourses.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-3 d-flex justify-content-center align-items-center">
              My Courses
              <Link to="/profile" className="text-success" style={{ textDecoration: 'none', fontSize: '2rem' }}>&rarr;</Link>
            </h2>
            <div className="row row-cols-1 row-cols-md-2 g-4">
              {console.log('Rendering enrolled courses:', enrolledCourses)}
              {enrolledCourses.slice(0, 2).map((course) => (
                <div key={course.id} className="col">
                  <div className="card h-100 shadow-sm">
                    <div className="card-body">
                      <h5 className="card-title">{course.title}</h5>
                      <div className="progress mb-3">
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
                      <Link to={`/course-content/${course.id}`} className="btn btn-primary">
                        Continue Learning
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {recommendedCourses.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-3">Recommended Courses</h2>
            <div className="row row-cols-1 row-cols-md-3 g-4">
              {recommendedCourses.map((course) => (
                <div key={course.id} className="col">
                  <div className="card h-100 shadow-sm">
                    <div className="card-body">
                      <h5 className="card-title">{course.title}</h5>
                      <p className="card-text">Difficulty: {course.difficulty}</p>
                      <p className="card-text">Rating: {course.rating}</p>
                      <Link
                        to={isEnrolled(course.id) ? `/course-content/${course.id}` : `/course-details/${course.id}`}
                        className="btn btn-primary"
                      >
                        {isEnrolled(course.id) ? 'Continue Learning' : 'View Details'}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Newest Courses and Top Rated Courses sections */}
        <section className="mb-5">
          <h2 className="mb-3">Newest Courses</h2>
          <div className="row row-cols-1 row-cols-md-3 g-4">
            {applyFiltersToCourses(newestCourses).map((course) => (
              <div key={course.id} className="col">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">{course.title}</h5>
                    <p className="card-text">Difficulty: {course.difficulty}</p>
                    <p className="card-text">Rating: {course.rating}</p>
                    <Link
                      to={isEnrolled(course.id) ? `/course-content/${course.id}` : `/course-details/${course.id}`}
                      className="btn btn-primary"
                    >
                      {isEnrolled(course.id) ? 'Continue Learning' : 'View Details'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h2 className="mb-3">Top Rated Courses</h2>
          <div className="row row-cols-1 row-cols-md-3 g-4">
            {applyFiltersToCourses(topRatedCourses).map((course) => (
              <div key={course.id} className="col">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">{course.title}</h5>
                    <p className="card-text">Difficulty: {course.difficulty}</p>
                    <p className="card-text">Rating: {course.rating}</p>
                    <Link
                      to={isEnrolled(course.id) ? `/course-content/${course.id}` : `/course-details/${course.id}`}
                      className="btn btn-primary"
                    >
                      {isEnrolled(course.id) ? 'Continue Learning' : 'View Details'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Upcoming Deadlines Section */}
        {deadlines.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-3">Upcoming Deadlines</h2>
            <ul className="list-group">
              {deadlines.map((deadline, index) => (
                <li key={index} className="list-group-item">
                  {deadline.title}: {new Date(deadline.date).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Announcements Section */}
        <section className="mb-5">
          <h2 className="mb-3">Announcements</h2>
          <ul className="list-group">
            {announcements.map((announcement, index) => (
              <li key={index} className="list-group-item">{announcement}</li>
            ))}
          </ul>
        </section>

        {/* Quick Actions */}
        <section className="text-center">
          <h2 className="mb-3">Quick Actions</h2>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/profile" className="btn btn-info">View Profile</Link>
            <button className="btn btn-warning">Take a Quiz</button>
            <button className="btn btn-success">Join Live Session</button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StudentDashboard;
