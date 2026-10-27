# Blog Platform with Comments

A full-stack blogging platform where users can register, log in, create / edit / delete posts and comment on them.

## Tech Stack
- **Backend:** Node.js, Express, RESTful API
- **Database:** SQLite (better-sqlite3) - file `blog.db` is auto-created
- **Auth:** JWT + bcrypt password hashing
- **Frontend:** HTML, CSS, Vanilla JavaScript (single page, hash routing)

## Features
- User registration, login, JWT authentication
- Create, edit, delete blog posts (only the author can edit/delete)
- Comment section (logged-in users comment; comment owner or post author can delete)
- Search posts by keyword
- Input validation and XSS-safe rendering

## How to Run
1. Install Node.js (v18+)
2. In this folder run:
   ```
   npm install
   npm start
   ```
3. Open **http://localhost:3000**

(Optional) Change `JWT_SECRET` in the `.env` file.

## Folder Structure
```
blog-platform/
├── server.js            # app entry point
├── db.js                # SQLite connection + tables
├── middleware/auth.js   # JWT sign/verify
├── routes/
│   ├── auth.js          # register, login, me
│   ├── posts.js         # post CRUD + post comments
│   └── comments.js      # edit/delete comment
├── public/              # frontend (index.html, style.css, app.js)
├── .env.example
└── README.md
```

## API Endpoints
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | - | Create account |
| POST | /api/auth/login | - | Login, returns token |
| GET | /api/auth/me | Yes | Current user |
| GET | /api/posts?q= | - | List / search posts |
| GET | /api/posts/:id | - | Single post |
| POST | /api/posts | Yes | Create post |
| PUT | /api/posts/:id | Yes (author) | Edit post |
| DELETE | /api/posts/:id | Yes (author) | Delete post |
| GET | /api/posts/:id/comments | - | List comments |
| POST | /api/posts/:id/comments | Yes | Add comment |
| PUT | /api/comments/:id | Yes (owner) | Edit comment |
| DELETE | /api/comments/:id | Yes (owner / post author) | Delete comment |

Send the token as: `Authorization: Bearer <token>`
