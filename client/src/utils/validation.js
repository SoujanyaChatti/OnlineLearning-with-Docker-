export const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return "Email is required.";
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
};

export const validateNotEmpty = (value, fieldName) => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required.`;
  }
  return null;
};
