import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav>
      <ul style={{ listStyle: 'none', display: 'flex', gap: '20px' }}>
        <li><Link to="/login">Login</Link></li>
        <li><Link to="/signup">Signup</Link></li>
        <li><Link to="/student">Student Dashboard</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;