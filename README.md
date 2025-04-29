## Database Setup
The database schema is defined in `database/schema.sql`. To initialize the PostgreSQL database:
1. Install PostgreSQL and start the service.
2. Create a database: `createdb learning_platform`.
3. Apply the schema: `psql -d learning_platform -f database/schema.sql`.

## Backend Setup
1. Navigate to `server/`.
2. Run `npm install` to install dependencies.
3. Ensure `.env` in the project root has `DATABASE_URL=postgres://your-username@localhost:5432/learning_platform` and a `JWT_SECRET`.
4. Update `index.js` with `require('dotenv').config({ path: '../.env' });`.
5. Start the server: `npx nodemon index.js`.

## Backend Setup
- Server runs on port 3000 (switched from 5000 due to port conflict with ControlCe).
- Authentication:
  - POST /api/auth/signup: Creates user with JWT token (e.g., {"name": "Test User", ...}).
  - POST /api/auth/login: Authenticates user and returns token.
## Troubleshooting
- Resolved 403 by freeing port 5000 and switching to 3000.
- Fixed "Cannot GET" by ensuring POST method in Postman.


## Backend Setup
- Server runs on port 3000.
- APIs:
  - POST /api/auth/signup: Creates user with JWT.
  - POST /api/auth/login: Authenticates user.
  - POST /api/courses: Creates courses.
  - POST /api/courses/modules: Creates modules.
  - POST /api/courses/course-content: Adds content.
  - POST /api/courses/quizzes: Adds quizzes.
  - POST /api/courses/enrollments/:id/progress: Updates progress.
## Troubleshooting
- Resolved foreign key violations by ensuring course and module existence.
- Fixed JSON parsing for quizzes with explicit stringification.
- Handled duration parsing ('10m') for progress calculation with CASE statements.

## API Updates
- Added GET /api/courses/course-content/:id to retrieve content details.

## API Updates
- Corrected route to GET /api/courses/modules/:id/content due to mounting under /api/courses.

## API Updates
- Enhanced CoursePlayer to list all module content.
- Verified POST /api/courses/enrollments for course enrollment.

## Database Enhancements
I added extra tables to the database to facilitate the frontend requirements, enhancing functionality. The updated schema includes:

```sql
-- Users Table
CREATE TABLE public.users (
    id integer NOT NULL DEFAULT nextval('public.users_id_seq'::regclass),
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL UNIQUE,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL CHECK (role IN ('student', 'instructor', 'admin')),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Courses Table
CREATE TABLE public.courses (
    id integer NOT NULL DEFAULT nextval('public.courses_id_seq'::regclass),
    title character varying(255) NOT NULL,
    description text,
    category character varying(100),
    difficulty character varying(20) CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    rating double precision DEFAULT 0.0,
    instructor_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT courses_pkey PRIMARY KEY (id),
    CONSTRAINT courses_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id)
);

-- Modules Table
CREATE TABLE public.modules (
    id integer NOT NULL DEFAULT nextval('public.modules_id_seq'::regclass),
    course_id integer,
    title character varying(255) NOT NULL,
    description text,
    order_index integer DEFAULT 0,
    CONSTRAINT modules_pkey PRIMARY KEY (id),
    CONSTRAINT modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE
);

-- Course Content Table (Added by Me)
CREATE TABLE public.coursecontent (
    id integer NOT NULL DEFAULT nextval('public.coursecontent_id_seq'::regclass),
    module_id integer,
    type character varying(10) CHECK (type IN ('video', 'PDF')),
    url character varying(255) NOT NULL,
    duration character varying(20),
    order_index integer DEFAULT 0,
    CONSTRAINT coursecontent_pkey PRIMARY KEY (id),
    CONSTRAINT coursecontent_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE
);

-- Enrollments Table
CREATE TABLE public.enrollments (
    id integer NOT NULL DEFAULT nextval('public.enrollments_id_seq'::regclass),
    course_id integer,
    user_id integer,
    progress double precision DEFAULT 0.0,
    enrolled_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT enrollments_pkey PRIMARY KEY (id),
    CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
    CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT unique_enrollment UNIQUE (course_id, user_id),
    INDEX idx_enrollments_course_user (course_id, user_id)
);

-- Quizzes Table
CREATE TABLE public.quizzes (
    id integer NOT NULL DEFAULT nextval('public.quizzes_id_seq'::regclass),
    module_id integer,
    questions json NOT NULL,
    passing_score integer NOT NULL,
    course_id integer,
    CONSTRAINT quizzes_pkey PRIMARY KEY (id),
    CONSTRAINT quizzes_module_id_key UNIQUE (module_id),
    CONSTRAINT quizzes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
    CONSTRAINT quizzes_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE
);

-- Quiz Submissions Table (Added by Me)
CREATE TABLE public.quizsubmissions (
    id integer NOT NULL DEFAULT nextval('public.quizsubmissions_id_seq'::regclass),
    quiz_id integer,
    user_id integer,
    score integer,
    attempts integer DEFAULT 0,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    enrollment_id integer,
    CONSTRAINT quizsubmissions_pkey PRIMARY KEY (id),
    CONSTRAINT quizsubmissions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE,
    CONSTRAINT quizsubmissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT quizsubmissions_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id)
);

-- Forum Posts Table (Added by Me)
CREATE TABLE public.forumposts (
    id integer NOT NULL DEFAULT nextval('public.forumposts_id_seq'::regclass),
    course_id integer,
    user_id integer,
    content text NOT NULL,
    upvotes integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT forumposts_pkey PRIMARY KEY (id),
    CONSTRAINT forumposts_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
    CONSTRAINT forumposts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    INDEX idx_forum_posts_course (course_id)
);

-- User Votes Table (Added by Me)
CREATE TABLE public.uservotes (
    id integer NOT NULL DEFAULT nextval('public.uservotes_id_seq'::regclass),
    user_id integer,
    post_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uservotes_pkey PRIMARY KEY (id),
    CONSTRAINT uservotes_user_id_post_id_key UNIQUE (user_id, post_id),
    CONSTRAINT uservotes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forumposts(id) ON DELETE CASCADE,
    CONSTRAINT uservotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Ratings Table (Added by Me)
CREATE TABLE public.ratings (
    id integer NOT NULL DEFAULT nextval('public.ratings_id_seq'::regclass),
    course_id integer,
    user_id integer,
    rating integer CHECK (rating BETWEEN 1 AND 5),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ratings_pkey PRIMARY KEY (id),
    CONSTRAINT ratings_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
    CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Sequences for Auto-Increment
CREATE SEQUENCE public.coursecontent_id_seq AS integer START 1 INCREMENT 1;
CREATE SEQUENCE public.courses_id_seq AS integer START 1 INCREMENT 1;
CREATE SEQUENCE public.enrollments_id_seq AS integer START 1 INCREMENT 1;
CREATE SEQUENCE public.forumposts_id_seq AS integer START 1 INCREMENT 1;
CREATE SEQUENCE public.modules_id_seq AS integer START 1 INCREMENT 1;
CREATE SEQUENCE public.quizsubmissions_id_seq AS integer START 1 INCREMENT 1;
CREATE SEQUENCE public.quizzes_id_seq AS integer START 1 INCREMENT 1;
CREATE SEQUENCE public.ratings_id_seq AS integer START 1 INCREMENT 1;
CREATE SEQUENCE public.users_id_seq AS integer START 1 INCREMENT 1;
CREATE SEQUENCE public.uservotes_id_seq AS integer START 1 INCREMENT 1;

-- Link Sequences to Tables
ALTER SEQUENCE public.coursecontent_id_seq OWNED BY public.coursecontent.id;
ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;
ALTER SEQUENCE public.enrollments_id_seq OWNED BY public.enrollments.id;
ALTER SEQUENCE public.forumposts_id_seq OWNED BY public.forumposts.id;
ALTER SEQUENCE public.modules_id_seq OWNED BY public.modules.id;
ALTER SEQUENCE public.quizsubmissions_id_seq OWNED BY public.quizsubmissions.id;
ALTER SEQUENCE public.quizzes_id_seq OWNED BY public.quizzes.id;
ALTER SEQUENCE public.ratings_id_seq OWNED BY public.ratings.id;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
ALTER SEQUENCE public.uservotes_id_seq OWNED BY public.uservotes.id;
```
## Setup Instructions

### Local Setup
To run the project locally, follow these steps:

1. **Install Dependencies**:
   - Ensure Node.js and PostgreSQL are installed on your machine.
   - Install Git to clone the repository.

2. **Database Setup**:
   - The database schema is defined in `database/schema.sql`.
   - Initialize PostgreSQL:
     1. Start the PostgreSQL service.
     2. Create a database: `createdb learning_platform`.
     3. Apply the schema: `psql -d learning_platform -f database/schema.sql`.
   - Update the `DATABASE_URL` in the `.env` file to use localhost (e.g., `DATABASE_URL=postgres://your-username@localhost:5432/learning_platform`), replacing `your-username` with your PostgreSQL username.

3. **Backend Setup**:
   - Navigate to `server/`.
   - Run `npm install` to install dependencies.
   - Create or update a `.env` file in the project root with:
     - `DATABASE_URL=postgres://your-username@localhost:5432/learning_platform`
     - `JWT_SECRET=your-secret-key` (generate a secure random string).
   - Update `index.js` with `require('dotenv').config({ path: '../.env' });`.
   - Start the server: `npx nodemon index.js`.
   - Note: The server runs on port 3000 (changed from 5000 due to a conflict).

4. **Frontend Setup**:
   - Navigate to `client/`.
   - Run `npm install` to install dependencies.
   - Update the `API_URL` in `src/components/config.js` to `http://localhost:3000` to point to the local backend.
   - Start the development server: `npm start`.
   - Build for deployment (optional): `npm run build`.

5. **Verification**:
   - Open `http://localhost:3000` in your browser to test backend APIs (e.g., via Postman).
   - Open `http://localhost:3000` (or the port set by `npm start`, typically 3000) for the frontend.
   - Ensure the frontend communicates with the local backend by testing login or course enrollment.

## Development History
- **Initial Setup**: Set up PostgreSQL database and basic Express server.
- **Backend Development**:
  - Resolved port 5000 conflict by switching to 3000.
  - Fixed "Cannot GET" errors by using POST methods correctly.
  - Handled foreign key violations and JSON parsing for quizzes.
  - Added duration parsing for progress with CASE statements.
- **Frontend Development**:
  - Built the student dashboard with React, showing enrolled, newest, and top-rated courses.
  - Added filters and recommended courses based on enrollment.
  - Fixed 404 errors on API calls by correcting `API_URL` interpolation (resolved dual `config.js` files issue).
- **Database Enhancements**: I added tables (`coursecontent`, `forumposts`, `quizsubmissions`, `ratings`, `uservotes`) to support frontend features like content management, forums, quiz tracking, ratings, and voting.
- **Deployment**:
  - Deployed backend on Render (`my-learning-server-ma48.onrender.com`).
  - Deployed frontend on Render (`my-learning-client.onrender.com`).
  - Resolved refresh 404s by adding a rewrite rule to serve `index.html` for all routes.
- **Troubleshooting**:
  - Fixed 403 errors by ensuring port availability.
  - Addressed client-side routing issues with Render’s static site configuration.

## Deployment
- **Backend**: Deployed on Render with environment variables (`DATABASE_URL`, `JWT_SECRET`).
- **Frontend**: Deployed on Render with a rewrite rule (`/*` to `/index.html`) to handle SPA routing.
- **Access**: Visit `my-learning-client.onrender.com` after logging in.

## Future Improvements
- Add user-facing error messages for 404s or API failures.
- Enhance security with specific CORS origins.
- Implement certificate generation and download.
