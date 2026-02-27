# Build a Complete Invoice Generator

Build a production-ready invoice generator with PDF export and Stripe-ready checkout. Every file must be complete and working. No placeholders. No TODOs in code.

## Stack
- **Backend**: Express.js
- **Database**: SQLite via `better-sqlite3`
- **PDF**: `pdfkit`
- **Payments**: Stripe (configured via env var, gracefully disabled if key missing)
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
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  client_id INTEGER REFERENCES clients(id),
  status TEXT DEFAULT 'draft',
  currency TEXT DEFAULT 'USD',
  tax_rate REAL DEFAULT 0,
  notes TEXT DEFAULT '',
  due_date TEXT,
  issued_date TEXT,
  stripe_payment_link TEXT DEFAULT '',
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS business_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  default_currency TEXT DEFAULT 'USD',
  default_tax_rate REAL DEFAULT 0,
  default_payment_terms TEXT DEFAULT 'Net 30',
  stripe_secret_key TEXT DEFAULT ''
);
```

## Computed Fields

### Per invoice line item
- `amount = quantity * unit_price`

### Per invoice totals
- `subtotal = SUM(amount)` across all items
- `tax_amount = subtotal * (tax_rate / 100)`
- `total = subtotal + tax_amount`

### Invoice number format
- Auto-generate: `INV-YYYY-NNNN` where NNNN is zero-padded sequential counter per year
- Example: `INV-2026-0001`, `INV-2026-0002`

## Invoice Status Flow
`draft` → `sent` → `paid` | `overdue`

## API Routes

### Business Profile
- `GET /api/profile` → returns `{ profile }` (never return `stripe_secret_key` to client)
- `PUT /api/profile` — body: any profile fields including `stripe_secret_key` → returns `{ success: true }`

### Clients
- `GET /api/clients` → returns `{ clients: [...] }`
- `POST /api/clients` — body: `{ name, email, company?, address? }` → returns `{ client }`
- `PUT /api/clients/:id` → returns `{ client }`
- `DELETE /api/clients/:id` → returns `{ success: true }`

### Invoices
- `GET /api/invoices` → returns `{ invoices: [...] }` with totals computed, client name included, sorted by `created_at DESC`
- `GET /api/invoices/:id` → returns `{ invoice, client, items }` with full totals
- `POST /api/invoices` — body: `{ client_id, items: [{ description, quantity, unit_price }], currency?, tax_rate?, notes?, due_date?, issued_date? }` → auto-generates invoice number, creates items, returns `{ invoice }`
- `PUT /api/invoices/:id` — body: any subset including `items` (replace all items if provided) → returns `{ invoice }`
- `DELETE /api/invoices/:id` → returns `{ success: true }`
- `PATCH /api/invoices/:id/status` — body: `{ status }` → returns `{ invoice }`

### PDF Export
- `GET /api/invoices/:id/pdf` — generate and stream PDF, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="INV-XXXX.pdf"`

### Stripe Payment Link
- `POST /api/invoices/:id/payment-link` — creates a Stripe Payment Link for the invoice total, saves to `stripe_payment_link`, returns `{ payment_link_url }`
- Requires `STRIPE_SECRET_KEY` env var OR the key stored in `business_profile`
- If Stripe not configured: return `{ error: "Stripe not configured" }` with 400

## PDF Layout (pdfkit)

Page: A4, margins 40px all sides.

### Header section
- Business name (large, bold)
- Business address and email (small, gray)
- "INVOICE" title (right-aligned, large, amber `#FBBF24`)
- Invoice number, issued date, due date (right-aligned)

### Bill To section
- "BILL TO" label (small caps, gray)
- Client name (bold)
- Client company, email, address

### Line Items table
- Columns: Description | Qty | Unit Price | Amount
- Alternating row backgrounds (white / very light gray)
- Header row with bold labels

### Totals section (right-aligned)
- Subtotal
- Tax (if tax_rate > 0): "Tax (X%): $Y"
- **Total** (bold, larger)

### Footer
- Notes (if any)
- "Thank you for your business." in gray italic
- Payment link as clickable text if available

### Styling
- Font: Helvetica (built into pdfkit, no external fonts needed)
- Primary color: `#0D1117`
- Accent: `#FBBF24`
- Gray: `#6B7280`

## Frontend (public/index.html)

Single file. Inline all styles and JS.

### Design
- Background: `#0D1117`
- Card: `#161B22`
- Border: `#30363D`
- Accent: `#FBBF24`
- Text: `#E6EDF3`
- Muted: `#8B949E`
- Status badges: draft (gray), sent (blue), paid (green), overdue (red)
- Font: system-ui

### Four Views

#### 1. Dashboard (default)
- Invoice stats row: Total invoices, Total revenue, Outstanding, Overdue
- Invoice table: number, client, total, status badge, due date, actions
- Actions per row: View, Download PDF, Generate Payment Link, Mark Paid, Delete
- "New Invoice" button (top right)
- Filter by status (All / Draft / Sent / Paid / Overdue)

#### 2. Invoice Editor (New / Edit)
- Select client (dropdown) or create new client inline
- Line items table:
  - Rows: description input, qty input, unit price input, calculated amount, delete row button
  - "Add Item" button adds a new row
  - Live-calculated subtotal, tax, total below table
- Tax rate input (%)
- Currency selector (USD, EUR, GBP, AED)
- Due date picker
- Notes textarea
- Save as Draft / Send Invoice buttons

#### 3. Invoice Detail
- Read-only view of invoice
- Download PDF button
- Generate Stripe Payment Link button (if Stripe configured)
- Show payment link as copyable field after generation
- Mark as Paid button
- Status history

#### 4. Settings
- Business profile form: name, email, address, default currency, default tax rate, payment terms
- Stripe Secret Key input (password type, saved server-side only)
- Client management table

### Navigation
- Sidebar or top nav with: Dashboard, New Invoice, Clients, Settings
- Use view-switching (no page reload)

## server.js Requirements
- ES modules
- Database: `./data/invoices.db`
- Initialize `business_profile` row with id=1 on startup (INSERT OR IGNORE)
- Static serve `public/`
- STRIPE_SECRET_KEY: check env var first, then database profile, then disabled
- Never log or return the Stripe key to the client

## package.json
```json
{
  "name": "invoice-generator",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "express": "^4.18.2",
    "pdfkit": "^0.15.0",
    "stripe": "^16.0.0"
  }
}
```

## render.yaml
```yaml
services:
  - type: web
    name: invoice-generator
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: STRIPE_SECRET_KEY
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
- [ ] Create client, create invoice with 3 line items
- [ ] Totals calculated correctly (subtotal, tax, total)
- [ ] Invoice number auto-increments correctly
- [ ] PDF downloads with correct layout and all data
- [ ] Stripe payment link created and saved (when key configured)
- [ ] Status updates work (draft → sent → paid)
- [ ] Business profile saves and persists
- [ ] Stripe key never returned in API responses
- [ ] Filter by status works in dashboard
