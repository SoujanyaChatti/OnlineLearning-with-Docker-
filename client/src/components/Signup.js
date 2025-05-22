import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from './config'; // Import the config
import { storeToken, storeUserType, handleRedirect } from '../utils/auth'; // Import auth functions
import { validateEmail, validateNotEmpty } from '../utils/validation'; // Import validation functions
import ErrorDisplay from './common/ErrorDisplay'; // Import ErrorDisplay component
import './Form.css'; // Import the new CSS file

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [userType, setUserType] = useState('student'); // Default to student
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    const nameError = validateNotEmpty(name, 'Name');
    if (nameError) {
      setError(nameError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validateNotEmpty(password, 'Password');
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
    // const userTypeError = validateNotEmpty(userType, 'User Type');
    // if (userTypeError) {
    //   setError(userTypeError);
    //   return;
    // }

    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, { email, password, name, userType });
      storeToken(response.data.token); // Use auth function
      storeUserType(userType); // Use auth function
      handleRedirect(userType, navigate); // Use auth function for redirection
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Check your credentials or server connection.');
    }
  };

  return (
    <div className="form-container-background"> {/* Apply new class for background */}
      <div className="form-container-overlay"> {/* Apply new class for overlay */}
        <h1 className="text-center mb-4">Signup</h1>
        <ErrorDisplay message={error} />
        <form onSubmit={handleSubmit} className="needs-validation" noValidate>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name:</label>
            <input
              type="text"
              className="form-control"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email:</label>
            <input
              type="email"
              className="form-control"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password:</label>
            <input
              type="password"
              className="form-control"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="userType" className="form-label">User Type:</label>
            <select
              className="form-select"
              id="userType"
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              required
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn btn-success w-100">Signup</button>
        </form>
        <p className="text-center mt-3">
          Already have an account? <Link to="/login" className="text-decoration-none">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
