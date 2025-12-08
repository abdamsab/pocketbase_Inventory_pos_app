Great — below is a **complete system specification document** for a **PocketBase-backed Inventory Management + POS + Receipt Printing** system for small → medium businesses. It’s written as a developer-friendly spec you can hand to engineers, with database (PocketBase collections), API shapes, hooks/business logic, deployment, security, testing, and operational runbook. I did **not** ask follow-ups — I made reasonable design decisions based on typical SMB requirements; if you want anything changed (e.g., add multi-currency, fiscal printers, or offline sync), tell me and I’ll update the spec.

# Full System Specification — Inventory Management + POS (PocketBase)

---

## 1 — Executive summary (one-line)

Build an on-premise or cloud PocketBase backend plus web/mobile frontends that provides inventory management, POS transactions, receipt generation & printing, reporting, role-based access control and operational tooling suitable for SMBs.

---

## 2 — Scope & non-goals

### In scope

* Product catalog, suppliers, locations, stock movement histories.
* POS checkout (cash / manual card), sales and sales items, inventory adjustments.
* Receipt generation (PDF / HTML) and printing (browser + ESC/POS support).
* User roles: cashier, manager, admin.
* Basic reports (daily sales, top products, low stock).
* Hooks: auto-stock update, receipt generation, reorder alerts.
* Deployment (single server / Docker), backups, basic monitoring.

### Out of scope (can be added later)

* Integrated card processing (full card capture/PCI) — recommend payment gateway integration (Paystack/Flutterwave).
* High-availability multi-region clustering.
* Full offline-first sync (advanced) — PocketBase can be part of an offline design but advanced sync logic not included here.
* Fiscal-printer regulatory compliance for specific countries (some countries require fiscal printers; handling that is region specific).

---

## 3 — Actors & user stories

### Actors

* **Cashier** — rings sales, prints receipts, view products.
* **Manager** — receives stock, creates POs, views reports, adjusts inventory.
* **Admin** — full system configuration, user management.
* **Customer** — receives printed/digital receipt (not a system user).
* **System (automated)** — scheduled jobs and hooks that generate alerts, backups.

### Example user stories

* As a cashier I can log in, scan/select items, complete a sale, and print a receipt.
* As a manager I can create a purchase order and mark it received to update stock.
* As an admin I can define reorder points and get notified when stock is low.
* As the system I create an immutable receipt when a sale completes and store it as PDF.

---

## 4 — Non-functional requirements (NFR)

* **Availability:** single server with process supervision (systemd/Docker restart). Target 99% for SMB setup.
* **Performance:** Handle bursts of POS writes — design for up to ~500 sales/day initially. If >1000s/day consider alternative DB.
* **Scalability:** Vertical scale (bigger VM) recommended; horizontal scaling not required initially.
* **Security:** HTTPS, JWT authentication tokens, RBAC, logs for audit.
* **Backup/RPO:** daily snapshot of `pb_data` (db + files). Manual or scripted.
* **Localization:** currency (₦ default), date/time zone aware (Africa/Lagos).

---

## 5 — High level architecture

* **Frontend(s):** React web for POS and manager console; optional React Native for mobile.
* **Backend:** PocketBase as single executable (serves REST, WebSocket realtime, Admin UI).
* **Data storage:** SQLite (embedded inside PocketBase `pb_data`).
* **Files:** PocketBase file storage (receipts, images). Optional: S3 adapter for scale.
* **Receipt Engine:** Server-side PDF generation (hook) or client-side HTML → print; thermal printer via ESC/POS from client.
* **Deployment:** Docker / systemd, Nginx reverse proxy + TLS.

---

## 6 — PocketBase Collections (data model)

Below are recommended collections with field definitions. Use PocketBase collection editor to create collection fields and types.

> Note: PocketBase uses field types: `text`, `number`, `bool`, `email`, `date`, `file`, `json`, `relation`, `richtext`, `select` (enum), etc.

### 6.1 `users` (built-in auth user)

* `name` — text
* `email` — email (unique)
* `password` — (handled by PocketBase)
* `role` — select: `cashier`, `manager`, `admin`
* `location` — relation → `locations` (optional)
* **Rules:** registration allowed only by admin OR via invite flow.

### 6.2 `locations`

* `name` — text
* `address` — text
* `code` — text (store code)
* `timezone` — text
* `tax_rate` — number (e.g., 7.5)

### 6.3 `suppliers`

* `name` — text
* `phone` — text
* `email` — email
* `address` — text
* `lead_time_days` — number (for reorder planning)

### 6.4 `categories`

* `name` — text
* `parent` — relation → `categories` (optional)

### 6.5 `products`

* `name` — text
* `sku` — text (unique)
* `barcode` — text (optional)
* `category` — relation → `categories`
* `cost_price` — number (how much we bought)
* `sale_price` — number (default selling price)
* `reorder_point` — number (threshold)
* `stock` — number (current stock — can be computed or maintained by hooks)
* `image` — file
* `is_active` — bool

**Notes:** Maintaining `stock` as a materialized field speeds reads; ensure hooks maintain it (on InventoryEntry and Sales creation).

### 6.6 `inventory_entries` (audit log of stock movement)

* `product` — relation → `products`
* `location` — relation → `locations`
* `type` — select: `in`, `out`, `adjustment`, `return`
* `quantity` — number (+ve)
* `reference_type` — text (e.g., `sale`, `purchase_order`, `manual`)
* `reference_id` — text (id to link to the source record)
* `note` — text
* `created_by` — relation → `users`
* `created_at` — date (auto)

> This is the source of truth. Current stock = sum(in) - sum(out) for product and location (but we will also maintain `products.stock` for performance).

### 6.7 `purchase_orders`

* `po_number` — text
* `supplier` — relation → `suppliers`
* `status` — select: `draft`, `ordered`, `received`, `cancelled`
* `ordered_by` — relation → `users`
* `expected_date` — date
* `total_cost` — number
* `created_at` — date

### 6.8 `purchase_order_items`

* `purchase_order` — relation → `purchase_orders`
* `product` — relation → `products`
* `quantity` — number
* `unit_cost` — number

### 6.9 `sales`

* `sale_number` — text (unique formatted)
* `user` — relation → `users`
* `location` — relation → `locations`
* `payment_method` — select: `cash`, `card`, `mobile`, `other`
* `subtotal` — number
* `tax` — number
* `discount` — number
* `total` — number
* `created_at` — date

### 6.10 `sales_items`

* `sale` — relation → `sales`
* `product` — relation → `products`
* `quantity` — number
* `unit_price` — number
* `line_total` — number (quantity * unit_price - discount)

### 6.11 `receipts`

* `sale` — relation → `sales`
* `receipt_number` — text
* `file` — file (PDF) or `url` — text
* `printed_by` — relation → `users`
* `created_at` — date

---

## 7 — REST API endpoints (logical)

PocketBase automatically exposes endpoints for collections, but it helps to present canonical endpoints for clients and to define request/response shapes.

### Authentication

* `POST /api/collections/users/auth-with-password`
  Payload: `{ "identity": "email", "password": "..." }`
  Response: session token + user object.

### Products

* `GET /api/collections/products/records?filter=...&page=1&perPage=50`
* `GET /api/collections/products/records/:id`
* `POST /api/collections/products/records` (admin/manager)
* `PATCH /api/collections/products/records/:id`
* `DELETE /api/collections/products/records/:id`

### Sales (checkout)

* `POST /api/collections/sales/records`
  Payload example:

  ```json
  {
    "user": "userId",
    "location": "locationId",
    "payment_method": "cash",
    "subtotal": 5700,
    "tax": 0,
    "discount": 0,
    "total": 5700
  }
  ```
* Create `sales_items` via batch create or separate endpoints:
  `POST /api/collections/sales_items/records` (multiple calls or server-side create via hook).
* After sale creation, hook will generate `inventory_entries` and `receipts`.

### Inventory Entries

* `GET /api/collections/inventory_entries/records?filter=product=xxx`

### Reports (custom endpoints or frontend aggregation)

* Use client to call collection queries and aggregate; for heavy queries, create lightweight custom endpoint (PocketBase embed) that runs server-side aggregation and returns summarized data.

---

## 8 — Business logic: Hooks & Workflows (detailed)

PocketBase supports lifecycle hooks (onRecordBeforeCreate, onRecordAfterCreate, etc.). Implement hooks in PocketBase `pb_migrations` or `pb_hooks` using JS or Go.

### 8.1 Sale complete → stock update + receipt creation

**Trigger:** `onRecordAfterCreate` for `sales`

**Steps:**

1. For each `sales_items` that belong to the sale, create an `inventory_entries` record of type `out` for the product and location, quantity = sold quantity, reference_type = `sale`, reference_id = sale id.
2. Decrement `products.stock` atomically (read current -> subtract -> save). (Note: take care of concurrency; if multiple simultaneous sales, implement optimistic check or use locking pattern).
3. Generate receipt:

   * Build receipt data (store name, address, sale_number, date/time, items, totals).
   * Generate PDF (via `jsPDF` or server Go library `gofpdf`) and save to `receipts.file`.
4. Insert `receipts` record with link to file and `printed_by` null (or set if printing command was issued).
5. If `products.stock <= reorder_point`, create or enqueue reorder alert (email or notification).

**Pseudocode (JS hook):**

```js
onRecordAfterCreate(async (e) => {
  if (e.collection.name !== 'sales') return;

  const saleId = e.record.id;
  const saleItems = await pb.collection('sales_items').getFullList({ filter: `sale='${saleId}'` });

  for (const item of saleItems) {
    // create inventory entry
    await pb.collection('inventory_entries').create({
      product: item.product,
      location: e.record.location,
      type: 'out',
      quantity: item.quantity,
      reference_type: 'sale',
      reference_id: saleId,
      created_by: e.record.user
    });

    // update product stock
    const prod = await pb.collection('products').getOne(item.product);
    const newStock = (prod.stock || 0) - item.quantity;
    await pb.collection('products').update(item.product, { stock: newStock });
    // check reorder
    if (newStock <= prod.reorder_point) {
      // insert or send alert (email/notification)
    }
  }

  // generate receipt PDF and store file -> receipts collection
});
```

**Edge cases / validation**

* Prevent sale if quantity > available stock unless you allow backorders.
* If concurrent sales cause negative stock, implement last-writer wins or optimistic checks.

### 8.2 Purchase order received → add stock

**Trigger:** `onRecordAfterUpdate` for `purchase_orders` when status becomes `received`.

**Steps:**

* For each item in `purchase_order_items` create `inventory_entries` of type `in`.
* Increase `products.stock` accordingly.

### 8.3 Manual inventory adjustment

* Admin/manager can create `inventory_entries` of type `adjustment`. Hook updates `products.stock` accordingly and keep note for audit.

### 8.4 Receipt printing hook (optional)

* When `receipts.print_request` flag is set (or endpoint called), mark `receipts.printed_by` and `printed_at` fields, and optionally queue a message for a local print agent.

---

## 9 — Receipt generation & printing options

### Option A: Server-side PDF generation (recommended for uniform receipts)

* Use server-side (hook) library:

  * JS: `pdfkit`, `jspdf` (Node), `pdfmake`
  * Go: `gofpdf`, `unidoc` (paid)
* Store generated PDF in PocketBase file storage (`receipts.file`).
* Frontend fetches file and prints via browser or downloads.

**Receipt content**

* Merchant name, address, VAT/TIN if needed.
* Receipt number (unique), date/time.
* Line items: qty, description, unit price, line total.
* Subtotal, tax, discount, grand total.
* Payment method, cashier name, optional signature line.
* Footer: return policy, merchant contact.

**Receipt number strategy**

* Format: `YYYY-MM-DD-LOC-COUNTER` or simple incremental per location stored in a `counters` small collection.
* Ensure atomic increment using PocketBase server-side logic to reduce duplicates.

### Option B: Client-side HTML template + print

* Render receipt as a print-optimized HTML page and call `window.print()` from POS UI.
* For thermal printers, use special ESC/POS libraries to send raw data from client (Bluetooth or USB).

### Option C: ESC/POS thermal printing (mobile/tablet or desktop app)

* If using Bluetooth thermal printer from a tablet:

  * Use `react-native-esc-pos-printer` or native SDK to send print commands.
  * For web → use a local print server (Electron app or small local service) that receives instruction and triggers ESC/POS.

**Recommendation:** For SMBs start with server PDF + browser print. Add ESC/POS integration as a second phase.

---

## 10 — Security & access control

### Authentication

* Use PocketBase’s built-in auth (email/password).
* Use HTTPS for all external traffic. Frontends store session tokens securely.

### Authorization

* Use collection-level rules:

  * `products` read: role in (`cashier`, `manager`, `admin`)
  * `products` write: role in (`manager`, `admin`)
  * `sales` create: role in (`cashier`, `manager`, `admin`)
  * `sales` read: restrict to `location` if required
* For sensitive operations (e.g., editing receipts), use server hooks and admin-only rules.

### Secrets

* Keep SMTP credentials, any payment API keys, and PocketBase config secure on server environment variables or a secrets manager.

### Audit & logging

* Keep `inventory_entries` as immutable audit log.
* Enable server logs and rotate logs regularly.

---

## 11 — Backups, monitoring & operations

### Backups

* Scripted daily backup of `pb_data` folder (SQLite file + files).
* Example cron:

  ```bash
  0 2 * * * tar czf /backups/pb_data_$(date +\%F).tar.gz /opt/pocketbase/pb_data
  ```
* Keep 7–30 days of backups based on storage.

### Monitoring

* Use process monitor (systemd or Docker healthchecks).
* Monitor disk space (PocketBase files can grow fast).
* Alert for low disk, DB size, or frequent errors in logs.

### Disaster recovery

* Restore process: stop PocketBase, restore `pb_data` folder, start service.
* Test restores monthly.

---

## 12 — Deployment & infra (practical guide for Nigeria / SMB)

### Minimal (single shop, LAN)

* Single machine (low-cost PC or Raspberry Pi 4 for very small setups).
* Install PocketBase binary; run as systemd service.
* Frontend runs either on same server or any device on LAN (access via IP).
* Thermal printer connects to POS device (tablet/phone) locally.

### Recommended (cloud accessible)

* VPS (DigitalOcean, Contabo, or local/regional provider).
* Dockerize PocketBase or run binary.
* Nginx reverse proxy + Let's Encrypt for TLS.
* SMTP for email receipts (use Mailgun/SendGrid or local SMTP).
* Backups to object storage (S3 or compatible) or remote server.

### Sample systemd unit

```ini
[Unit]
Description=PocketBase server
After=network.target

[Service]
User=pocketbase
WorkingDirectory=/opt/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

---

## 13 — Client UX design highlights (POS)

* **Fast product search** by barcode/sku/name.
* **Keyboard friendly**: allow scanning + quick qty entry.
* **Cart panel** with editable quantities and line discounts.
* **Payment modal**: choose payment method, accept amount tendered, calculate change.
* **Offline notice** if backend unreachable; cache minimal catalog if offline mode implemented.
* **Print button**: immediate print or view receipt before printing.

---

## 14 — Testing plan

### Unit & integration tests

* Hook logic: simulate sale creation & assert inventory_entries created and products.stock updated.
* Receipt generation: verify PDF contains expected lines.
* API: create/read/update/delete operations for critical collections.

### End-to-end (E2E)

* Cypress or Playwright tests for POS flow: login, create sale, print receipt (or generate).
* Multi user tests: concurrent sales (simulate to observe DB behavior).

### Load testing

* Simulate concurrent sales using scripts to catch SQLite write contention. Consider WAL mode and test for expected traffic.

---

## 15 — Migration & data population

* Provide migration scripts to create initial collections and default admin user.
* Seed script for sample products to aid POS training.
* Migrations stored in `pb_migrations` folder (PocketBase supports migrations).

---

## 16 — Developer folder structure (recommended)

```
inventory-pos/
├─ backend/
│  ├─ pocketbase (binary)
│  ├─ pb_data/
│  ├─ pb_migrations/
│  ├─ pb_hooks/
│  │  ├─ onSalesAfterCreate.js
│  │  └─ onPurchaseOrderUpdate.js
│  └─ Dockerfile
├─ frontend/
│  ├─ pos/ (React app)
│  ├─ manager/ (React admin)
│  └─ shared/
└─ infra/
   ├─ nginx.conf
   ├─ docker-compose.yml
   └─ systemd/
```

---

## 17 — Implementation checklist (milestones)

1. **Prototype (0-2 weeks)**

   * Install PocketBase locally. Create collections. Simple React POS that can read products and create sales. Hook to create `sales_items` and `inventory_entries`. UI prints HTML receipt.

2. **Core features (2-6 weeks)**

   * Implement purchase orders, stock receipts, reorder alerts. Implement receipt PDF generation server-side. Implement authentication and RBAC rules. Add reporting pages.

3. **Hardware integration (6-8 weeks)**

   * Thermal printer integration for target POS devices. Test printing path on Android tablets / Windows machines.

4. **Hardening & ops (8-10 weeks)**

   * Backups, logging, monitoring, TLS, process supervision. E2E tests. Document runbook.

5. **Pilot & feedback (10-12 weeks)**

   * Pilot with 1–2 stores, collect operational feedback, tune for concurrency and backups.

> These are phased milestones to structure the work; adjust team velocity accordingly.

---

## 18 — Risks & mitigation

* **SQLite write contention at high throughput** — mitigate: WAL mode + increase hardware; if necessary, migrate to server DB and rearchitect (PocketBase assumes SQLite).
* **Receipt printing variability** — mitigate: offer PDF+browser print fallback and test with target printers.
* **Data loss (no backups)** — mitigate: schedule and test automated backups.
* **Security misconfiguration (exposed admin UI)** — mitigate: restrict admin UI via IP firewall, strong credentials and HTTPS.

---

## 19 — Example pocketbase hook snippets

### A. Sales after create (JS pseudo)

```js
// pb_hooks/onSalesAfterCreate.js
module.exports = async function({ app, record }) {
  if (record.collectionId !== 'sales') return;

  // fetch sale items
  const saleItems = await app.dao.findMany('sales_items', { filter: `sale='${record.id}'` });

  for (const it of saleItems) {
    // create inventory entry
    await app.dao.create('inventory_entries', {
      product: it.product,
      location: record.location,
      type: 'out',
      quantity: it.quantity,
      reference_type: 'sale',
      reference_id: record.id,
      created_by: record.user
    });

    // update product stock
    const prod = await app.dao.findRecordById('products', it.product);
    const newStock = (prod.stock || 0) - it.quantity;
    await app.dao.saveRecord('products', {...prod, stock: newStock});
  }

  // generate receipt (simple)
  const receiptPdfPath = await generateReceiptPdf(record, saleItems);
  await app.dao.create('receipts', { sale: record.id, file: receiptPdfPath, receipt_number: record.sale_number });
};
```

*(Implement `generateReceiptPdf` with `pdfkit` or `gofpdf` depending on environment.)*

---

## 20 — Final notes & next deliverable options

I can now produce any of the following **next artifacts** (pick one or more):

* A. **PocketBase migration file** (JSON or JS) that creates the collections above ready to import.
* B. **Detailed API contract** (OpenAPI / Swagger) covering endpoints, request/response examples.
* C. **React POS starter** code scaffold (ready to wire to PocketBase SDK) including a printable receipt template.
* D. **Print agent (Electron) design** to handle ESC/POS printers on local networks.
* E. **Full deployment scripts** (Docker Compose + Nginx + systemd + backup scripts).