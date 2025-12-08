# System Architecture: Enterprise Inventory & POS

## 1. Overview
Enterprise-grade Inventory and POS system built on PocketBase and React. Designed for scalability, security, and multi-location support.

## 2. Core Principles
- **Security First**: RBAC, API Rules, Input Validation.
- **Auditability**: All stock movements are recorded in `inventory_entries`.
- **Reliability**: Offline-tolerant frontend (future scope), robust backend hooks.

## 3. Data Flow & Logic

### A. Sales Process (POS)
1.  **Cashier** scans item -> Frontend finds product.
2.  **Checkout** -> Frontend sends `POST /api/collections/sales/records`.
3.  **Backend Hook (`onRecordAfterCreate`)**:
    -   Creates `sales_items`.
    -   Creates `inventory_entries` (Type: `out`).
    -   Updates `products.stock` (Atomic decrement).
    -   Generates Receipt PDF -> Saves to `receipts`.
4.  **Frontend** receives success -> Prints Receipt (Browser Print) or Emails Receipt (via Backend).

### B. Inventory Management
-   **Stock In**: Manager creates `purchase_order` -> Status `received` -> Hook creates `inventory_entries` (Type: `in`) -> Updates `products.stock`.
-   **Adjustments**: Manual correction -> Creates `inventory_entries` (Type: `adjustment`) -> Updates `products.stock`.

### C. Multi-Location
-   `sales` and `inventory_entries` are tagged with `location`.
-   Users are assigned a primary `location`.
-   Admin can view aggregate or per-location reports.

## 4. Security Architecture

### Authentication
-   **JWT**: Standard PocketBase Auth.
-   **Session**: Persisted in secure storage on client.

### Authorization (RBAC)
-   **Admin**: Full Access.
-   **Manager**:
    -   `products`: Read/Write
    -   `sales`: Read (All)
    -   `purchase_orders`: Read/Write
    -   `users`: Read (Cashiers only)
-   **Cashier**:
    -   `products`: Read
    -   `sales`: Create (Self), Read (Self)
    -   `receipts`: Read/Print

## 5. Technology Stack (Refined)
-   **Backend**: PocketBase (Go/JS Hooks).
-   **Email**: PocketBase Mailer (SMTP).
-   **Frontend**: React, TypeScript, TailwindCSS, React Query.
-   **Printing**: `react-to-print` (Browser Print) or Server-generated PDF.
