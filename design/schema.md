# Database Schema Design (PocketBase)

Based on `full_sys_spec_doc_01.md`.

## Collections

### 1. `users` (System Default)
- **Fields**:
    - `name`: Text
    - `email`: Email (Unique, Required)
    - `avatar`: File
    - `role`: Select (Options: `admin`, `manager`, `cashier`, Required)
    - `location`: Relation (Single, -> `locations`) - *Required for Cashiers/Managers*

### 2. `locations`
- **Fields**:
    - `name`: Text (Required)
    - `address`: Text
    - `code`: Text (Store Code, Unique, Required)
    - `timezone`: Text (Default: "Africa/Lagos")
    - `tax_rate`: Number (Default: 0)

### 3. `suppliers`
- **Fields**:
    - `name`: Text (Required)
    - `phone`: Text
    - `email`: Email
    - `address`: Text
    - `lead_time_days`: Number

### 4. `categories`
- **Fields**:
    - `name`: Text (Required)
    - `parent`: Relation (Single, -> `categories`) - *Optional*

### 5. `products`
- **Fields**:
    - `name`: Text (Required)
    - `sku`: Text (Unique, Required) - *Barcode/QR*
    - `barcode`: Text (Optional, secondary)
    - `category`: Relation (Single, -> `categories`, Required)
    - `cost_price`: Number (Required)
    - `sale_price`: Number (Required)
    - `stock`: Number (Default: 0)
    - `reorder_point`: Number (Default: 5)
    - `image`: File
    - `is_active`: Bool (Default: True)

### 6. `inventory_entries` (Audit Log)
- **Fields**:
    - `product`: Relation (Single, -> `products`, Required)
    - `location`: Relation (Single, -> `locations`, Required)
    - `type`: Select (Options: `in`, `out`, `adjustment`, `return`, Required)
    - `quantity`: Number (Required, Positive value)
    - `reference_type`: Text (e.g., `sale`, `purchase_order`, `manual`, Required)
    - `reference_id`: Text (Required)
    - `batch_number`: Text (Optional) - *For tracking specific batches*
    - `supplier`: Relation (Single, -> `suppliers`) - *Direct link for quick lookup*
    - `note`: Text
    - `created_by`: Relation (Single, -> `users`, Required)

### 7. `purchase_orders`
- **Fields**:
    - `po_number`: Text (Unique, Required)
    - `supplier`: Relation (Single, -> `suppliers`, Required)
    - `status`: Select (Options: `draft`, `ordered`, `received`, `cancelled`, Required)
    - `ordered_by`: Relation (Single, -> `users`, Required)
    - `expected_date`: Date
    - `total_cost`: Number

### 8. `purchase_order_items`
- **Fields**:
    - `purchase_order`: Relation (Single, -> `purchase_orders`, Required, Cascade Delete)
    - `product`: Relation (Single, -> `products`, Required)
    - `quantity`: Number (Required)
    - `unit_cost`: Number (Required)
    - `batch_number`: Text (Optional) - *Assigned upon receipt*

### 9. `sales`
- **Fields**:
    - `sale_number`: Text (Unique, Required)
    - `user`: Relation (Single, -> `users`, Required) - *Cashier*
    - `location`: Relation (Single, -> `locations`, Required)
    - `payment_method`: Select (Options: `cash`, `card`, `mobile`, `other`, Required)
    - `subtotal`: Number (Required)
    - `tax`: Number
    - `discount`: Number
    - `total`: Number (Required)
    - `status`: Select (Options: `completed`, `voided`, `refunded`, Required)

### 10. `sales_items`
- **Fields**:
    - `sale`: Relation (Single, -> `sales`, Required, Cascade Delete)
    - `product`: Relation (Single, -> `products`, Required)
    - `quantity`: Number (Required)
    - `unit_price`: Number (Required)
    - `line_total`: Number (Required)

### 11. `receipts`
- **Fields**:
    - `sale`: Relation (Single, -> `sales`, Required)
    - `receipt_number`: Text (Required)
    - `file`: File (PDF)
    - `printed_by`: Relation (Single, -> `users`)

## Indexes
- `products(sku)`
- `sales(created)`
- `inventory_entries(product)`
- `inventory_entries(created)`
