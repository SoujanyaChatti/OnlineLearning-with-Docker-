-- Drop existing tables if they exist
DROP TABLE IF EXISTS ForumPosts, QuizSubmissions, Quizzes, CourseContent, Enrollments, Modules, Courses, Users CASCADE;

-- Create Tables
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('student', 'instructor', 'admin')) NOT NULL
);

CREATE TABLE Courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty VARCHAR(20) CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    rating FLOAT DEFAULT 0.0,
    instructor_id INTEGER REFERENCES Users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES Courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0 -- To sort modules
);

CREATE TABLE CourseContent (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES Modules(id) ON DELETE CASCADE,
    type VARCHAR(10) CHECK (type IN ('video', 'PDF')),
    url VARCHAR(255) NOT NULL, -- Link or path to content
    duration VARCHAR(20), -- e.g., '10m' or '15s'
    order_index INTEGER DEFAULT 0 -- To sort content within module
);

CREATE TABLE Quizzes (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES Modules(id) ON DELETE CASCADE,
    questions JSON NOT NULL,
    passing_score INTEGER NOT NULL,
    UNIQUE (module_id) -- One quiz per module
);

CREATE TABLE Enrollments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES Courses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
    progress FLOAT DEFAULT 0.0, -- Percentage (0.0-100.0) based on module content
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE QuizSubmissions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES Quizzes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
    score INTEGER,
    attempts INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ForumPosts (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES Courses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add indexes for performance
CREATE INDEX idx_enrollments_course_user ON Enrollments(course_id, user_id);
CREATE INDEX idx_forum_posts_course ON ForumPosts(course_id);
