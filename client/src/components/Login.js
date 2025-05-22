import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from './config'; // Import the config
import { storeToken, storeUserType, handleRedirect } from '../utils/auth'; // Import auth functions
import { validateEmail, validateNotEmpty } from '../utils/validation'; // Import validation functions
import ErrorDisplay from './common/ErrorDisplay'; // Import ErrorDisplay component
import './Form.css'; // Import the new CSS file

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('student'); // Default to student
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

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

    // It's good practice to also validate userType if it's a critical field,
    // but the original code didn't, so we'll stick to the prompt's scope.
    // const userTypeError = validateNotEmpty(userType, 'User Type');
    // if (userTypeError) {
    //   setError(userTypeError);
    //   return;
    // }

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password, userType });
      storeToken(response.data.token); // Use auth function
      storeUserType(userType); // Use auth function
      handleRedirect(userType, navigate); // Use auth function for redirection
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials or server connection.');
    }
  };

  return (
    <div className="form-container-background"> {/* Apply new class for background */}
      <div className="form-container-overlay"> {/* Apply new class for overlay and remove form-container if it's redundant */}
        <h1 className="text-center mb-4">Login</h1>
        <ErrorDisplay message={error} />
        <form onSubmit={handleSubmit} className="needs-validation" noValidate>
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
          <button type="submit" className="btn btn-primary w-100">Login</button>
        </form>
        <p className="text-center mt-3">
          New user? <Link to="/signup" className="text-decoration-none">Signup</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
