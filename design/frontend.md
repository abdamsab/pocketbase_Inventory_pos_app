# Frontend Architecture: Enterprise Edition

## 1. Application Structure
```
src/
├── components/
│   ├── common/       # Button, Input, Modal, Table
│   ├── layout/       # AppShell, Sidebar, Header
│   ├── pos/          # ProductGrid, Cart, PaymentModal
│   ├── inventory/    # ProductForm, StockAdjustmentModal
│   └── reports/      # SalesChart, StockTable
├── hooks/            # useAuth, useCart, useScanner
├── lib/              # pocketbase, utils, constants
├── pages/
│   ├── auth/         # Login
│   ├── dashboard/    # Admin Overview
│   ├── pos/          # Terminal
│   ├── products/     # List, Create, Edit
│   ├── orders/       # Purchase Orders
│   ├── suppliers/    # Supplier Management
│   └── settings/     # Locations, Users
└── types/            # DB Interfaces
```

## 2. Key Modules

### A. POS Terminal
-   **Location Context**: POS operates in the context of the logged-in user's location.
-   **Offline Handling**: Graceful degradation if network fails (queue sales locally - *Phase 2*).
-   **Receipt Actions**: Print (Thermal 80mm/58mm), Email.
-   **Thermal Layout**: Specific CSS (`@media print`) to hide UI and format for small paper width (no margins, concise text).
-   **Hotkeys**: F-keys for common actions (F1: Search, F12: Pay).

### B. Purchase Orders (Manager)
-   **Workflow**: Create Draft -> Add Items -> Send to Supplier -> Receive Stock.
-   **UI**: Master-detail view for POs and their items.

### C. Supplier Management
-   CRUD for Suppliers.
-   View history of POs per supplier.

### D. Reporting & Dashboard
-   **Sales by Location**: Compare performance.
-   **Low Stock Alerts**: 
    -   **Widget**: Dashboard card showing products with `stock <= reorder_point`.
    -   **Notification**: Visual indicator (Bell icon) in header.

## 3. UI/UX Standards
-   **Framework**: TailwindCSS.
-   **Theme**: "Enterprise Clean" - High contrast, data-dense tables, clear call-to-actions.
-   **Feedback**: Toasts for all actions (Success/Error).
-   **Loading**: Skeleton loaders for data fetching.
