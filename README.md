
# 📝 Quick Note 2.0

### Your Space. Your Thoughts.

Quick Note is a full-stack, multi-user note-taking application built with Node.js, Express.js, PostgreSQL, HTML, CSS and JavaScript.

It provides users with individual private workspaces where they can securely create, view, edit, search and delete their personal notes.

Users can register, log in and access their notes from any supported device.

---

## 🌐 Live Application

**Live Website:** https://quick-note-tifz.onrender.com

**GitHub Repository:** https://github.com/Saurabh04-lab/quick-note

---

## ✨ Features

### 🔐 User Authentication
- User registration with email and password.
- Secure password hashing using bcrypt.
- Session-based authentication.
- Persistent login sessions stored in PostgreSQL.
- Secure logout functionality.
- Protected application dashboard.

### 📒 Personal Note Management
- Create notes with a title and content.
- View individual notes in a dedicated read-only space.
- Edit existing notes.
- Delete notes with confirmation.
- Search notes by title or content.
- Display note creation and last-update timestamps.
- Responsive note cards.

### 🔒 Privacy and Security
- Separate workspace for every registered user.
- Server-side note ownership verification.
- Passwords stored as hashes.
- HTTP-only session cookies.
- Secure cookies in production.
- Authentication rate limiting.
- Security headers using Helmet.
- Cross-origin request origin validation.
- PostgreSQL-backed session storage.

### 📱 Responsive Design
- Desktop-friendly interface.
- Mobile-responsive layout.
- Clean purple-and-white visual theme.
- Simple navigation and note management.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Frontend structure |
| CSS3 | Styling and responsive design |
| JavaScript | Frontend application logic |
| Node.js | Backend runtime |
| Express.js | REST API and server |
| PostgreSQL | Persistent relational database |
| Neon | Hosted PostgreSQL database |
| pg | PostgreSQL database driver |
| bcryptjs | Password hashing |
| express-session | User session management |
| connect-pg-simple | PostgreSQL session storage |
| Helmet | HTTP security headers |
| express-rate-limit | Authentication rate limiting |
| Fetch API | Asynchronous frontend communication |
| Git and GitHub | Version control |
| Render | Application deployment |

---

## 🏗️ Application Architecture

```text
                 QUICK NOTE 2.0
                        |
          +-------------+-------------+
          |                           |
      Frontend                    Backend
   HTML/CSS/JavaScript          Node.js/Express
          |                           |
       Fetch API              Authentication API
          |                           |
          +-------------+-------------+
                        |
                  PostgreSQL
                        |
             +----------+----------+
             |                     |
          Users                 Notes
             |                     |
         Account ID --------> Owner ID
```

Every note is associated with its owner's user ID.

The backend checks ownership during note retrieval, modification and deletion.

This prevents users from accessing or modifying another user's notes through the API.

---

## 📁 Project Structure

```text
quick-note/
│
├── backend/
│   ├── routes/
│   │   ├── auth.js
│   │   └── notes.js
│   │
│   ├── scripts/
│   │   └── migrate-json-notes.js
│   │
│   ├── db.js
│   └── server.js
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── data/
│   └── notes.json
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

The local JSON file is retained only for legacy note migration and is excluded from Git.

---

## ⚙️ Local Installation

### Prerequisites

- Node.js 20 or later.
- npm.
- Git.
- A PostgreSQL database.
- A Neon account or another compatible PostgreSQL provider.

### 1. Clone the repository

```bash
git clone https://github.com/Saurabh04-lab/quick-note.git
```

### 2. Navigate to the project

```bash
cd quick-note
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root.

```env
NODE_ENV=development
PORT=3001

DATABASE_URL=YOUR_POSTGRESQL_CONNECTION_STRING

SESSION_SECRET=YOUR_RANDOM_SECRET_OF_AT_LEAST_32_BYTES
```

Generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env` or expose database credentials.

### 5. Start the application

```bash
npm start
```

For development with automatic Node.js restarts:

```bash
npm run dev
```

### 6. Open the application

```text
http://localhost:3001
```

---

## 🔗 REST API Documentation

### Authentication API

Base path:

```text
/api/auth
```

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auth/me` | Check current login session |
| POST | `/api/auth/register` | Register a new account |
| POST | `/api/auth/login` | Authenticate a user |
| POST | `/api/auth/logout` | End the current session |

#### Register

```http
POST /api/auth/register
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

#### Check Session

```http
GET /api/auth/me
```

Authenticated response:

```json
{
  "authenticated": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  }
}
```

#### Logout

```http
POST /api/auth/logout
```

### Notes API

Base path:

```text
/notes
```

All note endpoints require an authenticated session.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notes` | Retrieve the current user's notes |
| POST | `/notes` | Create a note |
| PUT | `/notes/:id` | Update an owned note |
| DELETE | `/notes/:id` | Delete an owned note |

#### Create Note

```http
POST /notes
Content-Type: application/json
```

Request:

```json
{
  "title": "My First Note",
  "content": "Welcome to my private workspace."
}
```

#### Update Note

```http
PUT /notes/:id
Content-Type: application/json
```

Request:

```json
{
  "title": "Updated Note",
  "content": "This note has been updated."
}
```

#### Delete Note

```http
DELETE /notes/:id
```

#### Health Check

```http
GET /api/health
```

Checks application and PostgreSQL connectivity.

---

## 🗄️ Database Design

### Users Table

Stores registered user accounts.

| Column | Description |
|---|---|
| id | Unique user UUID |
| email | Unique account email |
| password_hash | Hashed password |
| created_at | Account creation timestamp |

### Notes Table

Stores individual user notes.

| Column | Description |
|---|---|
| id | Unique note UUID |
| owner_id | Associated user UUID |
| title | Note title |
| content | Note content |
| created_at | Creation timestamp |
| updated_at | Last modification timestamp |

The `owner_id` foreign key references `users.id` and uses `ON DELETE CASCADE`.

### Session Storage

Login sessions are stored in PostgreSQL using `connect-pg-simple`.

This avoids relying on Express's in-memory session store.

---

## 🧪 Testing and Verification

The application has undergone manual verification of:

- User registration.
- User login.
- Session restoration.
- User logout.
- Creating notes.
- Retrieving notes.
- Editing notes.
- Deleting notes.
- Individual read-only note viewing.
- Note searching.
- PostgreSQL connectivity.
- Two-user workspace isolation.
- Rejection of unauthenticated note requests.
- Cross-user note deletion protection.

### Example HTTP security responses

| Scenario | Expected response |
|---|---|
| Unauthenticated notes request | 401 Unauthorized |
| Access another user's note | 404 Not Found |
| Delete another user's note | 404 Not Found |
| Invalid request origin | 403 Forbidden |
| Successful note creation | 201 Created |

---

## 📦 Legacy Data Migration

The original application used a local JSON file.

A migration script is available at:

```text
backend/scripts/migrate-json-notes.js
```

Preview existing notes:

```bash
node backend/scripts/migrate-json-notes.js --preview
```

Set the destination account:

```powershell
$env:MIGRATE_OWNER_EMAIL = "your-email@example.com"
```

Import selected records:

```bash
node backend/scripts/migrate-json-notes.js --import --ids "NOTE_ID_1,NOTE_ID_2"
```

The migration script records completed imports to prevent duplication.

Keep a backup of legacy JSON data until migration is verified.

---

## 🚀 Deployment

### Hosting Architecture

| Component | Platform |
|---|---|
| Application hosting | Render |
| PostgreSQL database | Neon |
| Source code | GitHub |

### Render Configuration

Build command:

```bash
npm ci
```

Start command:

```bash
npm start
```

Health check path:

```text
/api/health
```

### Production Environment Variables

Configure the following in the Render dashboard:

```env
NODE_ENV=production
DATABASE_URL=YOUR_NEON_DATABASE_URL
SESSION_SECRET=YOUR_PRODUCTION_SECRET
APP_ORIGIN=https://your-render-service.onrender.com
```

Do not commit production credentials to GitHub.

---

## 🔐 Security and Privacy

Quick Note uses server-side authentication and PostgreSQL-backed sessions.

Notes are retrieved, updated and deleted using the authenticated user's ID.

The application does not rely on frontend filtering alone for privacy.

Passwords are hashed before storage.

Environment secrets are maintained separately from source code.

---

## 🎯 Project Objective

Quick Note demonstrates full-stack web development concepts through the implementation of:

- RESTful API architecture.
- Complete CRUD operations.
- Multi-user authentication.
- Private user workspaces.
- PostgreSQL relational data storage.
- Server-side authorization.
- Asynchronous JavaScript Fetch API.
- Responsive web development.
- Cloud deployment.

---

## 👨‍💻 Author

**Saurabh Mehta**

GitHub:

https://github.com/Saurabh04-lab

Project Repository:

https://github.com/Saurabh04-lab/quick-note

---

**Quick Note 2.0 — Your Space. Your Thoughts.**
