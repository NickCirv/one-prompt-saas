# Build a Complete URL Shortener

Build a production-ready URL shortener with analytics. Every file must be complete and working. No placeholders. No TODOs in code.

## Stack
- **Backend**: Express.js
- **Database**: SQLite via `better-sqlite3` (primary store + analytics)
- **Cache**: In-memory LRU cache (no external Redis dependency — keep it self-contained)
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
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  title TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  click_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  referrer TEXT DEFAULT '',
  user_agent TEXT DEFAULT ''
);
```

## API Routes

### Links
- `POST /api/links` — body: `{ url, custom_slug?, title?, expires_in_days? }` → returns `{ link: { id, slug, short_url, original_url, title, created_at, expires_at } }`
- `GET /api/links` — returns `{ links: [...] }` sorted by `created_at DESC`, includes `click_count`
- `GET /api/links/:slug/stats` — returns `{ link, clicks_by_day: [{ date, count }], recent_clicks: [...] }`
- `DELETE /api/links/:slug` → returns `{ success: true }`

### Redirect
- `GET /:slug` — looks up slug, increments click count, records click, redirects 302 to original URL
  - If slug not found: return 404 HTML page
  - If expired: return 410 HTML page

## Slug Generation
- If `custom_slug` provided: validate `/^[a-zA-Z0-9-_]{3,32}$/`, check uniqueness
- Otherwise: generate 6-character random alphanumeric slug, retry on collision
- Blocked slugs: `api`, `static`, `public`, `health`, `favicon.ico`

## Validation
- `url`: must be valid URL (https:// or http://), max 2048 chars
- `custom_slug`: alphanumeric + hyphens/underscores, 3-32 chars
- `expires_in_days`: integer 1-365 or omitted (no expiry)
- `title`: optional, max 100 chars

## Error Response Format
```json
{ "error": "Human-readable message" }
```

## In-Memory LRU Cache
- Implement a simple LRU cache (max 500 entries)
- Cache slug → `{ original_url, expires_at }` lookups
- Invalidate on delete
- This avoids every redirect hitting the DB

## Frontend (public/index.html)

Single file. Inline styles and JS.

### Design
- Background: `#0D1117`
- Card: `#161B22`
- Border: `#30363D`
- Accent: `#FBBF24`
- Text: `#E6EDF3`
- Muted: `#8B949E`
- Font: system-ui

### Sections
1. **Shorten form** — URL input, optional custom slug, optional title, optional expiry (dropdown: never/7 days/30 days/90 days), Submit button
2. **Result card** — shows short URL with copy button (clipboard API), original URL truncated
3. **My Links table** — list all shortened links with: short URL, original (truncated), title, clicks, created date, delete button
4. **Stats modal** — click "Stats" on any row → modal shows click count, clicks-per-day sparkline (SVG), last 5 clicks with timestamp and referrer

### Behavior
- No login required — links are public (this is the simple version)
- Copy button changes to "Copied!" for 2s
- Delete asks for confirmation
- Stats modal opens on click, closes on backdrop click or X button
- Real-time refresh: reload links table after shorten/delete

## server.js Requirements
- ES modules
- `BASE_URL` env var (used to construct short URLs, default: `http://localhost:3000`)
- Database: `./data/links.db`
- Static serve `public/`
- Redirect route `/:slug` must come AFTER all `/api/` routes
- Health endpoint: `GET /health` → `{ status: "ok", links: <count> }`

## package.json
```json
{
  "name": "url-shortener",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "express": "^4.18.2"
  }
}
```

## render.yaml
```yaml
services:
  - type: web
    name: url-shortener
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: BASE_URL
        sync: false
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

## Final Checklist
- [ ] Shorten a URL, get back a working short link
- [ ] Visiting the short link redirects correctly
- [ ] Click count increments on every redirect
- [ ] Stats endpoint returns clicks by day
- [ ] Custom slug validation works
- [ ] Expired links return 410
- [ ] LRU cache is populated on first lookup, served from cache on subsequent hits
