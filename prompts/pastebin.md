# Build a Complete Pastebin

Build a production-ready pastebin with syntax highlighting and expiry. Every file must be complete and working. No placeholders. No TODOs in code.

## Stack
- **Backend**: Express.js
- **Database**: SQLite via `better-sqlite3`
- **Syntax Highlighting**: Highlight.js (CDN, client-side)
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
CREATE TABLE IF NOT EXISTS pastes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT 'Untitled',
  content TEXT NOT NULL,
  language TEXT DEFAULT 'plaintext',
  visibility TEXT DEFAULT 'public',
  burn_after_read INTEGER DEFAULT 0,
  expires_at DATETIME,
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Routes

### Create
- `POST /api/pastes` — body: `{ content, title?, language?, visibility?, burn_after_read?, expires_in? }` → returns `{ paste: { slug, title, language, visibility, burn_after_read, expires_at, created_at, view_url } }`

### Read
- `GET /api/pastes/:slug` — returns `{ paste }`, increments view count, deletes if `burn_after_read`
- `GET /api/pastes` — returns public pastes only, sorted by `created_at DESC`, limit 50, no `content` field

### Delete
- `DELETE /api/pastes/:slug` — returns `{ success: true }`

### Raw
- `GET /raw/:slug` — returns plain text content with `Content-Type: text/plain`

## Field Specifications

### `language`
Accept these values (used as Highlight.js language identifier):
`plaintext`, `javascript`, `typescript`, `python`, `go`, `rust`, `php`, `ruby`, `java`, `c`, `cpp`, `csharp`, `bash`, `sql`, `html`, `css`, `json`, `yaml`, `markdown`, `dockerfile`

### `visibility`
- `public` — appears in recent pastes list
- `private` — only accessible via direct link (not in list)
- `unlisted` — same as private

### `expires_in`
- `never`, `10m`, `1h`, `1d`, `7d`, `30d`
- Calculate `expires_at` from this value on create
- On read: if `expires_at` is past, return 410 and delete the paste

### `burn_after_read`
- Boolean. If true, delete paste immediately after first successful read.

### `slug`
- Generate 8-character random alphanumeric slug
- Must be unique — retry on collision

## Validation
- `content`: required, max 500,000 characters
- `title`: max 200 characters
- `language`: must be in allowed list
- `visibility`: must be `public`, `private`, or `unlisted`

## Error Format
```json
{ "error": "Human-readable message" }
```

## Frontend (public/index.html)

Single file. Inline all styles and JS. Load Highlight.js from CDN.

### Design
- Background: `#0D1117`
- Editor area: `#010409` (near black for code contrast)
- Card: `#161B22`
- Border: `#30363D`
- Accent: `#FBBF24`
- Text: `#E6EDF3`
- Muted: `#8B949E`
- Font: system-ui for UI, `'JetBrains Mono', 'Fira Code', monospace` for code
- Load Highlight.js CSS theme `github-dark` from CDN

### Three Views

#### 1. Create view (default)
- Title input
- Language selector (dropdown with all supported languages)
- Visibility selector (Public / Private)
- Burn after read checkbox
- Expiry selector (Never / 10 min / 1 hour / 1 day / 7 days / 30 days)
- Large textarea for content (min 300px height, monospace font)
- Submit button → "Create Paste"
- After create: redirect to view page for the new paste

#### 2. View view (`?slug=<slug>`)
- Show title, language badge, visibility badge, created date, view count
- Rendered code block with Highlight.js syntax highlighting
- Copy button (copies raw content to clipboard)
- Raw link (opens `/raw/:slug`)
- Delete button (with confirmation)
- If burn_after_read was true: show banner "This paste was destroyed after viewing"

#### 3. Recent view (default if no ?slug and clicks "Browse")
- Grid of recent public paste cards
- Each card: title, language, snippet (first 150 chars), created date, view count
- Click card → navigate to `?slug=<slug>`

### Navigation
- Header: "pastebin" title (amber) + "New Paste" button + "Browse" link
- Use `?slug=` and `?view=browse` query params to route between views
- No page reload — use `history.pushState` and `window.onpopstate`

## server.js Requirements
- ES modules
- Database: `./data/pastes.db`
- Static serve `public/`
- Clean up expired pastes on startup (DELETE WHERE expires_at < now AND expires_at IS NOT NULL)
- Schedule cleanup every hour
- Health: `GET /health` → `{ status: "ok", pastes: <count> }`

## package.json
```json
{
  "name": "pastebin",
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
    name: pastebin
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
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
- [ ] Create a paste, get back a slug
- [ ] View paste with syntax highlighting applied
- [ ] Burn-after-read deletes paste on first view
- [ ] Expired paste returns 410
- [ ] Private paste not in recent list
- [ ] Raw endpoint returns plain text
- [ ] Copy button works
- [ ] Highlight.js correctly highlights JavaScript, Python, SQL at minimum
