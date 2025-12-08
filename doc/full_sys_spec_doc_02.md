Perfect ✅

We’ll now create a **Full System Specification Document** for your **Inventory & POS Management System built with PocketBase**, covering all core modules, database schema, API structure, logic workflows, hooks, integration plans, and non-functional requirements.

This document will serve as a **Blueprint for Implementation** — usable by both frontend and backend teams.

---

# 🧾 SYSTEM SPECIFICATION DOCUMENT

### Inventory Management & Point-of-Sale (POS) System

**Backend Powered by PocketBase**
**Version:** v1.0 Specification Draft
**Prepared for:** Small–Medium Retail Businesses

---

## 1. 📘 SYSTEM OVERVIEW

### 1.1 System Purpose

The system provides a unified solution for inventory management and retail POS operations. It helps small to medium businesses manage product stock, sales transactions, and receipts while supporting offline/local deployment or cloud hosting.

### 1.2 System Goals

* Centralize stock, sales, and user data.
* Allow multiple roles (cashier, manager, admin) with secure access.
* Support POS checkout and instant receipt generation.
* Track product movements (purchases, sales, adjustments).
* Enable reports and analytics (sales, stock, performance).
* Support multi-location (branches or warehouses).

---

## 2. 🧩 SYSTEM ARCHITECTURE

### 2.1 Architecture Type

**Client–Server architecture** using:

* **Frontend:** React / React Native
* **Backend:** PocketBase (Go + SQLite)
* **Communication:** REST & Realtime WebSocket
* **Storage:** Embedded SQLite with PocketBase file storage

### 2.2 Logical Flow

```
[Frontend UI]
   ↓ REST + WebSocket
[PocketBase API Layer]
   ↓
[SQLite Database + Collections]
   ↓
[Hooks / Migrations / Automations]
   ↓
[Generated Files (Receipts, Reports)]
```

### 2.3 Key Interactions

* **Frontend** communicates via `/api/collections/*`.
* **Hooks** automate workflows (stock updates, receipts).
* **Realtime** updates ensure live synchronization (e.g., sales screen auto-updates stock).

---

## 3. 🗂️ DATA MODEL (COLLECTIONS SCHEMA)

Each **PocketBase Collection** acts like a database table.

### 3.1 users

| Field       | Type                                 | Description          |
| ----------- | ------------------------------------ | -------------------- |
| `email`     | text                                 | User login email     |
| `password`  | password                             | Auth password        |
| `name`      | text                                 | Full name            |
| `role`      | text (enum: admin, manager, cashier) | Access role          |
| `location`  | relation → locations                 | Assigned branch/shop |
| `is_active` | bool                                 | Active status        |

### 3.2 suppliers

| Field     | Type | Description      |
| --------- | ---- | ---------------- |
| `name`    | text | Supplier name    |
| `phone`   | text | Contact number   |
| `email`   | text | Supplier email   |
| `address` | text | Supplier address |

### 3.3 categories

| Field         | Type | Description                       |
| ------------- | ---- | --------------------------------- |
| `name`        | text | Product category (e.g. Beverages) |
| `description` | text | Optional notes                    |

### 3.4 products

| Field           | Type                  | Description                |
| --------------- | --------------------- | -------------------------- |
| `sku`           | text                  | Unique product code        |
| `name`          | text                  | Product name               |
| `category`      | relation → categories | Category                   |
| `cost_price`    | number                | Purchase cost              |
| `sale_price`    | number                | Selling price              |
| `stock`         | number                | Current available quantity |
| `reorder_level` | number                | Minimum stock before alert |
| `supplier`      | relation → suppliers  | Linked supplier            |
| `image`         | file                  | Product image              |
| `barcode`       | text                  | Optional barcode string    |
| `status`        | bool                  | Active/Inactive            |

### 3.5 inventory_entries

| Field         | Type                         | Description                 |
| ------------- | ---------------------------- | --------------------------- |
| `product`     | relation → products          | Product reference           |
| `type`        | enum (`in`, `out`, `adjust`) | Stock movement type         |
| `quantity`    | number                       | Quantity added/removed      |
| `reference`   | text                         | Link to purchase or sale ID |
| `description` | text                         | Reason for movement         |
| `created_by`  | relation → users             | Staff who made the entry    |
| `created_at`  | date                         | Auto timestamp              |

### 3.6 sales

| Field          | Type                                       | Description             |
| -------------- | ------------------------------------------ | ----------------------- |
| `user`         | relation → users                           | Cashier handling sale   |
| `location`     | relation → locations                       | Branch of sale          |
| `total`        | number                                     | Total sale amount       |
| `tax`          | number                                     | Tax percentage or value |
| `discount`     | number                                     | Discount applied        |
| `payment_type` | enum (`cash`, `card`, `transfer`, `mixed`) | Payment method          |
| `amount_paid`  | number                                     | Amount tendered         |
| `balance`      | number                                     | Change or due           |
| `status`       | enum (`completed`, `pending`, `cancelled`) | Sale state              |
| `created_at`   | date                                       | Auto timestamp          |

### 3.7 sales_items

| Field        | Type                | Description           |
| ------------ | ------------------- | --------------------- |
| `sale`       | relation → sales    | Parent sale           |
| `product`    | relation → products | Sold product          |
| `quantity`   | number              | Units sold            |
| `unit_price` | number              | Price per item        |
| `subtotal`   | number              | quantity × unit_price |

### 3.8 receipts

| Field            | Type             | Description                    |
| ---------------- | ---------------- | ------------------------------ |
| `sale`           | relation → sales | Linked sale                    |
| `receipt_number` | text             | Generated ID (e.g., RCP-00051) |
| `pdf`            | file             | Stored receipt file            |
| `created_at`     | date             | Auto timestamp                 |

### 3.9 locations

| Field     | Type | Description    |
| --------- | ---- | -------------- |
| `name`    | text | Branch name    |
| `address` | text | Branch address |
| `phone`   | text | Contact number |

---

## 4. ⚙️ BUSINESS LOGIC AND WORKFLOWS

### 4.1 Create Sale Workflow

1. **Cashier selects items** → Client app creates a `sale` record.
2. **For each product sold:** create `sales_items` records.
3. **PocketBase hook:**

   * Deduct quantity from `products.stock`.
   * Create an `inventory_entries` record (`type = out`).
   * Generate a `receipt` (PDF or HTML).

**Example JS Hook:**

```js
onRecordAfterCreate('sales_items', async (e) => {
  const product = await $app.dao().findRecordById('products', e.record.get('product'));
  product.set('stock', product.get('stock') - e.record.get('quantity'));
  await $app.dao().saveRecord(product);

  await $app.dao().saveRecord(new Record('inventory_entries', {
    product: e.record.get('product'),
    type: 'out',
    quantity: e.record.get('quantity'),
    reference: e.record.get('sale')
  }));
});
```

---

### 4.2 Generate Receipt

Upon sale creation:

* A custom function generates a receipt (HTML/PDF).
* Stores it in `/pb_public/files/receipts/`.

**Receipt template example:**

```text
Shop: Damisa Retail Hub
Receipt #: RCP-1042
Date: 2025-10-09
---------------------------------
Product          Qty   Amount
Rice 5kg         2     ₦9000
Oil 1L           1     ₦1200
---------------------------------
TOTAL: ₦10,200
PAID: ₦10,200
---------------------------------
Thank you for shopping!
```

---

### 4.3 Stock Replenishment

When new goods arrive:

* Create `inventory_entries` with `type = in`.
* Hook automatically increments product stock.

---

### 4.4 Realtime Dashboard

Use PocketBase’s **realtime subscriptions** to:

* Monitor daily sales in dashboard.
* Notify managers of low stock in real-time.

Example:

```js
pb.collection('products').subscribe('*', (event) => {
  if (event.record.stock <= event.record.reorder_level) {
    alert(`${event.record.name} is running low!`);
  }
});
```

---

## 5. 🔐 ACCESS CONTROL (ACL)

| Role        | Permissions                                            |
| ----------- | ------------------------------------------------------ |
| **Admin**   | Full access to all collections                         |
| **Manager** | Read/write to products, sales, inventory; view reports |
| **Cashier** | Read products, create sales and receipts only          |
| **Guest**   | No access                                              |

**PocketBase Rules Example (sales collection):**

```
create: @request.auth.role = "cashier" || @request.auth.role = "manager"
update: @request.auth.role = "manager" || @request.auth.role = "admin"
delete: @request.auth.role = "admin"
```

---

## 6. 🧾 RECEIPT PRINTING & PDF GENERATION

### Options:

1. **Client-Side PDF:**
   Using `jspdf` or `pdfmake` from the frontend after sale success.
2. **Server-Side Hook:**
   Generate PDFs inside PocketBase (Go or JS script).
3. **Thermal Print (ESC/POS):**
   Via `react-native-esc-pos-printer` or `electron-pos-printer`.

---

## 7. 📊 REPORTING & ANALYTICS

| Report        | Source                                    | Computation                    |
| ------------- | ----------------------------------------- | ------------------------------ |
| Daily Sales   | `/sales` filtered by `created_at`         | Sum of totals                  |
| Top Products  | `/sales_items` grouped by product         | Count quantity sold            |
| Low Stock     | `/products` where `stock < reorder_level` | Alert list                     |
| Profit Report | (sale_price - cost_price) × quantity      | Calculated in hook or frontend |

---

## 8. 🌐 DEPLOYMENT PLAN

### Option 1: Local LAN Deployment

* Run PocketBase on a local PC (e.g., `http://192.168.1.100:8090`)
* Frontend connects to LAN IP.
* Great for offline-first environments.

### Option 2: Cloud VPS (Production)

* VPS: Ubuntu 22.04, Nginx, SSL via Certbot.
* PocketBase service via `systemd`.
* SQLite file backed up daily to S3/Google Drive.

---

## 9. 🔧 SYSTEM REQUIREMENTS

| Component | Minimum Requirement                     |
| --------- | --------------------------------------- |
| Server    | 2GB RAM, 2 Core CPU                     |
| Database  | SQLite (auto-managed)                   |
| Frontend  | Modern browser or Android POS device    |
| Printing  | Thermal printer (USB/Bluetooth/Network) |
| Network   | Optional (for LAN/cloud sync)           |

---

## 10. 🔮 FUTURE EXTENSIONS

* Integration with Paystack or Flutterwave.
* Barcode/QR code generation and scanning.
* Multi-branch synchronization.
* Stock forecasting with AI.
* SMS/Email receipt delivery.

---

## ✅ NEXT STEP

Would you like me to **generate the actual PocketBase migration schema and API endpoints documentation** (so you can import directly into your PocketBase instance)?
That would include:

* JSON definition for each collection
* Example REST endpoints (`GET /api/collections/sales/records`, etc.)
* Ready-to-import seed data
