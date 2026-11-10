
# Quick Note 📝

A clean, responsive, full-stack note-taking application built with Node.js, Express.js, HTML, CSS and JavaScript.

Quick Note provides a simple personal workspace where users can create, view, edit, search and delete notes through asynchronous REST API requests.

## ✨ Features

- **Create Notes:** Write and save notes with a title and content.
- **View Notes:** Open individual notes in a dedicated read-only viewing space.
- **Edit Notes:** Update previously saved notes.
- **Delete Notes:** Remove unwanted notes with confirmation.
- **Search Notes:** Find notes using their titles or content.
- **Persistent Local Storage:** Store notes in a local JSON file.
- **Responsive Interface:** Access the application on desktop, tablet and mobile.
- **Live Updates:** Interact with the backend asynchronously using Fetch API.
- **Input Validation:** Validate note titles and content on the backend.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Styling and responsive layout |
| JavaScript | Frontend functionality |
| Node.js | Backend runtime |
| Express.js | REST API framework |
| JSON | Local note storage |
| Fetch API | Asynchronous HTTP requests |

## 📁 Project Structure

```text
quick-note/
│
├── backend/
│   ├── routes/
│   │   └── notes.js
│   └── server.js
│
├── data/
│   └── notes.json
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites

- Node.js 18 or later
- npm
- Git

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Navigate to the project

```bash
cd quick-note
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the application

```bash
npm start
```

### 5. Open the application

Visit:

http://localhost:3001

## 🔗 REST API Documentation

Base URL:

```text
http://localhost:3001
```

### 1. Get All Notes

```http
GET /notes
```

Returns all saved notes.

### 2. Create a Note

```http
POST /notes
Content-Type: application/json
```

Request body:

```json
{
  "title": "My First Note",
  "content": "This is my first Quick Note."
}
```

### 3. Update a Note

```http
PUT /notes/:id
Content-Type: application/json
```

Request body:

```json
{
  "title": "Updated Note",
  "content": "This note has been updated."
}
```

### 4. Delete a Note

```http
DELETE /notes/:id
```

Deletes the note with the specified ID.

### 5. Health Check

```http
GET /api/health
```

Checks whether the backend server is running.

## 📦 API Response Example

```json
{
  "id": "unique-note-id",
  "title": "My First Note",
  "content": "Quick Note is working!",
  "createdAt": "2026-11-10T08:00:00.000Z",
  "updatedAt": "2026-11-10T08:00:00.000Z"
}
```

## 🧪 Testing

The application has been tested locally for:

- Creating notes using POST.
- Retrieving notes using GET.
- Updating notes using PUT.
- Deleting notes using DELETE.
- Persisting notes in JSON storage.
- Frontend and backend integration.
- Individual read-only note viewing.
- Note searching and responsive presentation.

## 🔒 Data Storage

The current development version uses a local JSON file.

The personal notes file is excluded from Git through `.gitignore`.

A persistent hosted database will be configured before production deployment.

## 🚀 Deployment

Deployment preparation is planned using a suitable hosting platform for the Node.js backend and persistent database.

The live application URL will be added here after deployment.

## 🎯 Project Objective

This project demonstrates full-stack web development fundamentals, including:

- RESTful API design.
- CRUD operations.
- Client-server communication.
- Asynchronous JavaScript.
- JSON-based data persistence.
- Responsive frontend development.

## 👨‍💻 Author

Developed as a full-stack web development project.

---

**Quick Note — Your Space. Your Thoughts.**
