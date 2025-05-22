import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'token';
const USER_TYPE_KEY = 'userType';

export const storeToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const decodeToken = (token) => {
  if (!token) {
    return null;
  }
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const getUserDetails = () => {
  const token = getToken();
  if (!token) {
    return null;
  }
  const decoded = decodeToken(token);
  if (!decoded) {
    return null;
  }
  // Assuming the token has 'id' and 'userType' claims
  // Adjust if the claims have different names e.g. 'sub' for id
  return {
    id: decoded.id || decoded.sub,
    userType: decoded.userType || getUserType(), // Fallback to localStorage userType if not in token
    // Add any other details you might need from the token
  };
};

export const storeUserType = (userType) => {
  localStorage.setItem(USER_TYPE_KEY, userType);
};

export const getUserType = () => {
  return localStorage.getItem(USER_TYPE_KEY);
};

export const handleRedirect = (userType, navigate) => {
  const redirectPath = userType === 'student' ? '/student' : userType === 'instructor' ? '/instructor' : '/admin';
  navigate(redirectPath);
};
