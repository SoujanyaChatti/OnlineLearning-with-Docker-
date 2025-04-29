-- Set configurations
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Drop Existing Tables (For a clean slate during initialization)
DROP TABLE IF EXISTS uservotes CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS quizsubmissions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS forumposts CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS coursecontent CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create Tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_role_check CHECK (role::text = ANY (ARRAY['student'::character varying, 'instructor'::character varying, 'admin'::character varying]::text[]))
);

CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty VARCHAR(20),
    rating DOUBLE PRECISION DEFAULT 0.0,
    instructor_id INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT courses_difficulty_check CHECK (difficulty::text = ANY (ARRAY['Beginner'::character varying, 'Intermediate'::character varying, 'Advanced'::character varying]::text[])),
    FOREIGN KEY (instructor_id) REFERENCES users(id)
);

CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE coursecontent (
    id SERIAL PRIMARY KEY,
    module_id INTEGER,
    type VARCHAR(10),
    url VARCHAR(255) NOT NULL,
    duration VARCHAR(20),
    order_index INTEGER DEFAULT 0,
    CONSTRAINT coursecontent_type_check CHECK (type::text = ANY (ARRAY['video'::character varying, 'PDF'::character varying]::text[])),
    CONSTRAINT unique_module_content UNIQUE (module_id, order_index),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER,
    user_id INTEGER,
    progress DOUBLE PRECISION DEFAULT 0.0,
    enrolled_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_enrollment UNIQUE (course_id, user_id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE forumposts (
    id SERIAL PRIMARY KEY,
    course_id INTEGER,
    user_id INTEGER,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    module_id INTEGER UNIQUE,
    questions JSON NOT NULL,
    passing_score INTEGER NOT NULL,
    course_id INTEGER,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE quizsubmissions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER,
    user_id INTEGER,
    score INTEGER,
    attempts INTEGER DEFAULT 0,
    submitted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    enrollment_id INTEGER,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
);

CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    course_id INTEGER,
    user_id INTEGER,
    rating INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ratings_rating_check CHECK (rating >= 1 AND rating <= 5),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE uservotes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    post_id INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uservotes_user_id_post_id_key UNIQUE (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES forumposts(id) ON DELETE CASCADE
);

-- Create Indexes
CREATE INDEX idx_enrollments_course_user ON enrollments (course_id, user_id);
CREATE INDEX idx_forum_posts_course ON forumposts (course_id);
