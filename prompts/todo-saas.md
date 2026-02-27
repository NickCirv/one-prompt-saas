# Build a Complete Todo SaaS

Build a production-ready todo application. Every file must be complete and working. No placeholders. No TODOs in code.

## Stack
- **Backend**: Express.js
- **Database**: SQLite via `better-sqlite3`
- **Frontend**: Vanilla HTML/CSS/JS (single `public/index.html`)
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **Runtime**: Node.js 18+

## Project Structure
```
package.json
server.js
public/
  index.html
render.yaml
Dockerfile
README.md
```

## Database Schema

Two tables, created on startup:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  due_date TEXT,
  completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Routes

All `/api/todos` routes require `Authorization: Bearer <token>` header.

### Auth
- `POST /api/auth/register` — body: `{ email, password }` → returns `{ token, user: { id, email } }`
- `POST /api/auth/login` — body: `{ email, password }` → returns `{ token, user: { id, email } }`

### Todos
- `GET /api/todos` — optional query: `?category=work&completed=false` → returns `{ todos: [...] }`
- `POST /api/todos` — body: `{ title, description?, category?, due_date? }` → returns `{ todo }`
- `PUT /api/todos/:id` — body: any subset of todo fields → returns `{ todo }`
- `DELETE /api/todos/:id` → returns `{ success: true }`
- `PATCH /api/todos/:id/toggle` → flips `completed`, returns `{ todo }`

## Validation Rules
- `email`: must be valid format
- `password`: minimum 8 characters
- `title`: required, max 200 characters
- `category`: one of `general`, `work`, `personal`, `health`, `finance` — default `general`
- `due_date`: ISO date string or null

## Error Response Format
All errors return:
```json
{ "error": "Human-readable message" }
```
With appropriate HTTP status codes: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 500 (server).

## JWT Middleware
- Extract token from `Authorization: Bearer <token>`
- Verify with `JWT_SECRET` env var (default: `"dev-secret-change-in-prod"`)
- Attach `req.user = { id, email }` on success
- Return 401 if missing or invalid

## Frontend (public/index.html)

Single-page app. All styles and JS inline in one file.

### Design
- Dark background: `#0D1117`
- Card background: `#161B22`
- Border: `#30363D`
- Accent: `#FBBF24` (amber)
- Text: `#E6EDF3`
- Muted: `#8B949E`
- Font: system-ui

### Pages / Views (show/hide via JS, no page reload)
1. **Login/Register view** — toggle tabs, form, error display
2. **Dashboard view** — after login
   - Header: app name + logout button
   - Filter bar: category pills + completed toggle
   - "New Todo" button → opens inline form
   - Todo list: each card shows title, category badge, due date, complete toggle, delete button
   - Empty state: friendly message when no todos match filters

### Behavior
- Store JWT in `localStorage`
- On load: check for stored token → show dashboard or auth view
- All API calls include `Authorization` header
- Optimistic UI: update list immediately, revert on error
- Category badge colors: each category gets a distinct muted color

## server.js Requirements
- Use ES modules (`import`/`export`)
- Database file: `./data/todos.db` (create `data/` dir if missing)
- `PORT` from env, default 3000
- Serve `public/` as static files
- All routes under `/api/`
- Graceful error handler middleware (catch-all)
- Log startup: `Server running on port X`

## package.json
```json
{
  "name": "todo-saas",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^9.4.3",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2"
  }
}
```

## render.yaml
```yaml
services:
  - type: web
    name: todo-saas
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: JWT_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production
    disk:
      name: data
      mountPath: /opt/render/project/src/data
      sizeGB: 1
```

## Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN mkdir -p data
EXPOSE 3000
CMD ["node", "server.js"]
```

## README.md
Include: what it is, local setup (npm install && npm start), env vars table, API reference summary, deploy button concept.

## Final Checklist
- [ ] `npm install && npm start` runs without errors
- [ ] Register, login, CRUD todos all work end-to-end
- [ ] JWT auth protects all todo routes
- [ ] Frontend works without any build step
- [ ] `render.yaml` is valid
- [ ] `Dockerfile` builds successfully
