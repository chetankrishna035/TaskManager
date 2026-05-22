# TaskFlow – Team Task Manager

A full-stack web application for collaborative team task management with role-based access control.

**Live Demo:** [your-railway-url-here]  
**GitHub:** [your-repo-url-here]

---

## Features

- **Authentication** – JWT-based signup/login with secure password hashing
- **Projects** – Create projects, invite members, manage roles (Admin/Member)
- **Tasks** – Create, assign, update, delete tasks with priority and due dates
- **Kanban Board** – Visual task management by status (To Do / In Progress / Done)
- **Dashboard** – Charts showing tasks by status, tasks per user, overdue alerts
- **Role-Based Access** – Admins manage everything; Members can only update their assigned tasks

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Recharts, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Deployment | Railway |

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/taskmanager.git
cd taskmanager
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/taskmanager
JWT_SECRET=your_long_random_secret_here
FRONTEND_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm run dev
```

App runs at `http://localhost:5173`

---

## Deployment on Railway

### Step 1 – Set up MongoDB Atlas
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas), create free cluster
2. Create database user and get connection string
3. Whitelist all IPs (`0.0.0.0/0`) under Network Access

### Step 2 – Deploy Backend on Railway
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub Repo
2. Select your repo, set **Root Directory** to `backend`
3. Add environment variables:
   - `MONGODB_URI` = your Atlas connection string
   - `JWT_SECRET` = a random 32+ character string
   - `FRONTEND_URL` = your frontend Railway URL (set after deploying frontend)
4. Deploy – Railway auto-detects Node.js and runs `npm start`
5. Copy your backend URL (e.g. `https://taskmanager-backend.up.railway.app`)

### Step 3 – Deploy Frontend on Railway
1. New Service → Deploy from same GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   - `VITE_API_URL` = `https://your-backend-url.up.railway.app/api`
4. Deploy – Railway builds with Vite and serves the static files

### Step 4 – Update CORS
Go back to backend service → update `FRONTEND_URL` variable to your frontend Railway URL.

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/projects` | List my projects | Any |
| POST | `/api/projects` | Create project | Any |
| GET | `/api/projects/:id` | Get project details | Member |
| PUT | `/api/projects/:id` | Update project | Admin |
| DELETE | `/api/projects/:id` | Delete project | Admin |
| POST | `/api/projects/:id/members` | Add member | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Remove member | Admin |

### Tasks
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/tasks?projectId=xxx` | List tasks | Member |
| POST | `/api/tasks` | Create task | Admin |
| GET | `/api/tasks/:id` | Get task | Member |
| PUT | `/api/tasks/:id` | Update task | Admin (full) / Member (status only) |
| DELETE | `/api/tasks/:id` | Delete task | Admin |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get stats & charts data |

---

## Database Schema

### User
```
name, email (unique), password (hashed), timestamps
```

### Project
```
name, description, createdBy (ref User), members [{ user (ref User), role: Admin|Member }], timestamps
```

### Task
```
title, description, project (ref Project), assignedTo (ref User), createdBy (ref User),
status: To Do|In Progress|Done, priority: Low|Medium|High, dueDate, timestamps
```

---

## Project Structure

```
taskmanager/
├── backend/
│   ├── models/        # Mongoose models (User, Project, Task)
│   ├── routes/        # Express route handlers
│   ├── middleware/    # JWT auth middleware
│   ├── server.js      # Express app entry point
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/  # Layout, TaskModal
    │   ├── context/     # AuthContext (React Context + JWT)
    │   ├── pages/       # Login, Signup, Dashboard, Projects, ProjectDetail
    │   └── utils/       # Axios instance with auth interceptor
    ├── index.html
    └── vite.config.js
```

---

## Environment Variables Summary

### Backend
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (Railway sets automatically) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT signing (keep private!) |
| `FRONTEND_URL` | Allowed CORS origin (your frontend URL) |

### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
