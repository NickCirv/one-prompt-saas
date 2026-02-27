# Build a Complete Status Page

Build a production-ready status page with health checks, incident history, and email alerts. Every file must be complete and working. No placeholders. No TODOs in code.

## Stack
- **Backend**: Express.js
- **Database**: SQLite via `better-sqlite3`
- **Email**: Nodemailer (SMTP config via env vars)
- **Frontend**: Vanilla HTML/CSS/JS (single `public/index.html`)
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

```sql
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  check_interval_seconds INTEGER DEFAULT 60,
  timeout_ms INTEGER DEFAULT 5000,
  status TEXT DEFAULT 'unknown',
  last_checked_at DATETIME,
  last_status_change_at DATETIME,
  uptime_percentage REAL DEFAULT 100.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'investigating',
  severity TEXT DEFAULT 'minor',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  updates TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS alert_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Enums

### Service status
`operational`, `degraded`, `down`, `unknown`

### Incident status
`investigating`, `identified`, `monitoring`, `resolved`

### Incident severity
`minor`, `major`, `critical`

## API Routes

### Services (Admin)
- `GET /api/services` → returns `{ services: [...] }` with last 10 checks per service
- `POST /api/services` — body: `{ name, url, check_interval_seconds?, timeout_ms? }` → returns `{ service }`
- `PUT /api/services/:id` — body: any subset → returns `{ service }`
- `DELETE /api/services/:id` → returns `{ success: true }`
- `POST /api/services/:id/check` — trigger an immediate health check → returns `{ check }`

### Incidents
- `GET /api/incidents` → returns `{ incidents: [...] }`, includes resolved ones from last 30 days
- `POST /api/incidents` — body: `{ service_id, title, status?, severity? }` → returns `{ incident }`
- `PUT /api/incidents/:id` — body: `{ status?, update_message? }` → appends update to `updates` JSON array with timestamp, updates `resolved_at` if status=resolved → returns `{ incident }`

### Alerts
- `POST /api/alerts/subscribe` — body: `{ email }` → returns `{ success: true }`
- `DELETE /api/alerts/unsubscribe` — body: `{ email }` → returns `{ success: true }`

### Public
- `GET /api/status` — returns `{ overall_status, services: [...], active_incidents: [...] }` (public, no sensitive config data)
- `GET /health` → `{ status: "ok" }`

## Health Check Logic

Run on a timer per service (using `check_interval_seconds`):
1. HTTP GET the service URL with `timeout_ms` timeout
2. Record: status code, response time, success/failure
3. Status rules:
   - 2xx → `operational`
   - 3xx → `operational`
   - 4xx → `degraded`
   - 5xx / timeout / connection error → `down`
4. If status changes from prior check:
   - Update `services.status` and `last_status_change_at`
   - Auto-create incident if status goes to `down` or `degraded`
   - Auto-resolve incident if status returns to `operational`
   - Send email alerts to all subscribed emails
5. Keep only last 500 checks per service (delete older ones)
6. Recalculate uptime: (operational checks / total checks in last 24h) * 100

## Email Alert Format (Nodemailer)

On status change to `down`:
- Subject: `[ALERT] <service name> is down`
- Body: Service name, current status, time of detection, link to status page

On recovery:
- Subject: `[RESOLVED] <service name> is operational`
- Body: Service name, downtime duration, recovery time

SMTP config via env vars:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `ALERT_FROM_EMAIL` (default: `alerts@status.local`)
- If SMTP vars not set: log alert to console instead of sending email

## Frontend (public/index.html)

Single file. Inline all styles and JS.

### Design
- Background: `#0D1117`
- Card: `#161B22`
- Border: `#30363D`
- Operational: `#22C55E` (green)
- Degraded: `#FBBF24` (amber)
- Down: `#EF4444` (red)
- Unknown: `#6B7280` (gray)
- Text: `#E6EDF3`
- Font: system-ui

### Public Dashboard (default)

1. **Overall status banner** — full-width, color-coded: "All Systems Operational" / "Partial Outage" / "Major Outage"

2. **Services list** — each service card shows:
   - Service name
   - Status indicator (colored dot + label)
   - Response time (last check)
   - 90-day uptime bar (30 rectangles, each = 3 days, colored by average status)
   - Uptime percentage

3. **Uptime bar calculation** — query last 90 days of checks, group by 3-day windows, color:
   - All operational → green
   - Any down → red
   - Otherwise → amber
   - No data → gray

4. **Active Incidents** section — each incident:
   - Title, severity badge, started time
   - Incident status
   - Latest update message

5. **Incident History** — resolved incidents from last 30 days, collapsed by default

6. **Subscribe to alerts** — email input + "Subscribe" button

### Admin Panel (via `?admin=true`)

Show additional controls:
- "Add Service" form (name, URL, check interval)
- Per-service: Edit, Delete, Force Check buttons
- "Create Incident" form
- Per-incident: Add Update, Resolve buttons

No auth on admin panel (this is the simple version — note in README that users should add auth before production use).

### Auto-Refresh
- Refresh status data every 60 seconds
- Show "Last updated X seconds ago" counter

## server.js Requirements
- ES modules
- Database: `./data/status.db`
- Static serve `public/`
- Start health check timers for all services on startup (stagger starts to avoid thundering herd)
- Use `setInterval` per service, store intervals in a Map
- When service added/edited/deleted: clear old interval, set new one

## package.json
```json
{
  "name": "status-page",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "express": "^4.18.2",
    "nodemailer": "^6.9.9"
  }
}
```

## render.yaml
```yaml
services:
  - type: web
    name: status-page
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: SMTP_HOST
        sync: false
      - key: SMTP_PORT
        sync: false
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASS
        sync: false
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

## Final Checklist
- [ ] Add a service, see it checked automatically
- [ ] Status updates when service is down/up
- [ ] Incident auto-created on downtime
- [ ] Uptime percentage calculated correctly
- [ ] Subscribe/unsubscribe email works
- [ ] Email sent (or logged) on status change
- [ ] Public dashboard renders all sections
- [ ] Admin panel visible at `?admin=true`
- [ ] Auto-refresh every 60 seconds works
