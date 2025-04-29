import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import StudentDashboard from './components/StudentDashboard';
//import CourseContent from './components/CourseContent';
import CourseDetails from './components/CourseDetails';
import CourseContent from './components/dummy';
import Profile from './components/Profile';
import InstructorDashboard from './components/InstructorDashboard';


// Placeholder components for other dashboards

const AdminDashboard = () => <h1>Admin Dashboard (Under Development)</h1>;

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/course-content/:id" element={<CourseContent />} />
      <Route path="/course-details/:id" element={<CourseDetails />} />
      <Route path="/instructor" element={<InstructorDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/instructor" element={<InstructorDashboard />} />
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;