/**
 * PocketBase Database Schema Setup
 * Run this script to create all required collections for Phase 1-3 enhancements
 * 
 * INSTRUCTIONS:
 * 1. Open PocketBase Admin UI (http://127.0.0.1:8090/_/)
 * 2. Navigate to Settings > Import collections
 * 3. Paste the JSON below and click Import
 * 
 * OR manually create collections using the schema definitions below
 */

// ============================================
// SUPPLIERS COLLECTION
// ============================================
const suppliersSchema = {
    name: "suppliers",
    type: "base",
    schema: [
        {
            name: "name",
            type: "text",
            required: true,
            options: {
                min: 1,
                max: 200
            }
        },
        {
            name: "contact_person",
            type: "text",
            required: false,
            options: {
                max: 200
            }
        },
        {
            name: "email",
            type: "email",
            required: false
        },
        {
            name: "phone",
            type: "text",
            required: false,
            options: {
                max: 50
            }
        },
        {
            name: "address",
            type: "text",
            required: false,
            options: {
                max: 500
            }
        },
        {
            name: "payment_terms",
            type: "text",
            required: false,
            options: {
                max: 200
            }
        },
        {
            name: "notes",
            type: "text",
            required: false
        },
        {
            name: "active",
            type: "bool",
            required: true,
            options: {
                default: true
            }
        }
    ],
    indexes: ["CREATE INDEX idx_suppliers_name ON suppliers (name)"],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'"
};

// ============================================
// PURCHASE ORDERS COLLECTION
// ============================================
const purchaseOrdersSchema = {
    name: "purchase_orders",
    type: "base",
    schema: [
        {
            name: "po_number",
            type: "text",
            required: true,
            options: {
                min: 1,
                max: 50,
                pattern: "^PO-\\d{6}$"
            }
        },
        {
            name: "supplier",
            type: "relation",
            required: true,
            options: {
                collectionId: "suppliers",
                cascadeDelete: false,
                minSelect: 1,
                maxSelect: 1,
                displayFields: ["name"]
            }
        },
        {
            name: "order_date",
            type: "date",
            required: true
        },
        {
            name: "expected_date",
            type: "date",
            required: false
        },
        {
            name: "received_date",
            type: "date",
            required: false
        },
        {
            name: "status",
            type: "select",
            required: true,
            options: {
                maxSelect: 1,
                values: ["draft", "sent", "partial", "received", "cancelled"]
            }
        },
        {
            name: "total",
            type: "number",
            required: true,
            options: {
                min: 0
            }
        },
        {
            name: "notes",
            type: "text",
            required: false
        },
        {
            name: "created_by",
            type: "relation",
            required: true,
            options: {
                collectionId: "users",
                cascadeDelete: false,
                minSelect: 1,
                maxSelect: 1,
                displayFields: ["name"]
            }
        }
    ],
    indexes: [
        "CREATE UNIQUE INDEX idx_po_number ON purchase_orders (po_number)",
        "CREATE INDEX idx_po_status ON purchase_orders (status)",
        "CREATE INDEX idx_po_supplier ON purchase_orders (supplier)"
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.role = 'admin'"
};

// ============================================
// PURCHASE ORDER ITEMS COLLECTION
// ============================================
const purchaseOrderItemsSchema = {
    name: "purchase_order_items",
    type: "base",
    schema: [
        {
            name: "purchase_order",
            type: "relation",
            required: true,
            options: {
                collectionId: "purchase_orders",
                cascadeDelete: true,
                minSelect: 1,
                maxSelect: 1
            }
        },
        {
            name: "product",
            type: "relation",
            required: true,
            options: {
                collectionId: "products",
                cascadeDelete: false,
                minSelect: 1,
                maxSelect: 1,
                displayFields: ["name", "sku"]
            }
        },
        {
            name: "quantity_ordered",
            type: "number",
            required: true,
            options: {
                min: 1
            }
        },
        {
            name: "quantity_received",
            type: "number",
            required: true,
            options: {
                min: 0,
                default: 0
            }
        },
        {
            name: "unit_cost",
            type: "number",
            required: true,
            options: {
                min: 0
            }
        },
        {
            name: "total",
            type: "number",
            required: true,
            options: {
                min: 0
            }
        }
    ],
    indexes: [
        "CREATE INDEX idx_poi_po ON purchase_order_items (purchase_order)",
        "CREATE INDEX idx_poi_product ON purchase_order_items (product)"
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
};

// ============================================
// STOCK ADJUSTMENTS COLLECTION (Phase 3)
// ============================================
const stockAdjustmentsSchema = {
    name: "stock_adjustments",
    type: "base",
    schema: [
        {
            name: "product",
            type: "relation",
            required: true,
            options: {
                collectionId: "products",
                cascadeDelete: false,
                minSelect: 1,
                maxSelect: 1,
                displayFields: ["name", "sku"]
            }
        },
        {
            name: "adjustment_type",
            type: "select",
            required: true,
            options: {
                maxSelect: 1,
                values: ["increase", "decrease"]
            }
        },
        {
            name: "quantity",
            type: "number",
            required: true,
            options: {
                min: 1
            }
        },
        {
            name: "reason",
            type: "select",
            required: true,
            options: {
                maxSelect: 1,
                values: ["damage", "loss", "found", "correction", "return", "other"]
            }
        },
        {
            name: "notes",
            type: "text",
            required: false
        },
        {
            name: "adjusted_by",
            type: "relation",
            required: true,
            options: {
                collectionId: "users",
                cascadeDelete: false,
                minSelect: 1,
                maxSelect: 1,
                displayFields: ["name"]
            }
        },
        {
            name: "previous_stock",
            type: "number",
            required: true
        },
        {
            name: "new_stock",
            type: "number",
            required: true
        }
    ],
    indexes: [
        "CREATE INDEX idx_adj_product ON stock_adjustments (product)",
        "CREATE INDEX idx_adj_date ON stock_adjustments (created)"
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'"
};

// ============================================
// MANUAL SETUP INSTRUCTIONS
// ============================================
console.log(`
==============================================
POCKETBASE COLLECTION SETUP INSTRUCTIONS
==============================================

Please create the following collections manually in PocketBase Admin UI:

1. SUPPLIERS
   - Fields: name (text, required), contact_person (text), email (email), 
             phone (text), address (text), payment_terms (text), notes (text), active (bool)
   - Permissions: List/View (authenticated), Create/Update/Delete (admin only)

2. PURCHASE_ORDERS
   - Fields: po_number (text, unique, pattern: PO-XXXXXX), supplier (relation to suppliers),
             order_date (date), expected_date (date), received_date (date),
             status (select: draft, sent, partial, received, cancelled),
             total (number), notes (text), created_by (relation to users)
   - Permissions: List/View (authenticated), Create/Update (authenticated), Delete (admin only)

3. PURCHASE_ORDER_ITEMS
   - Fields: purchase_order (relation to purchase_orders, cascade delete),
             product (relation to products), quantity_ordered (number),
             quantity_received (number, default 0), unit_cost (number), total (number)
   - Permissions: All operations (authenticated users)

4. STOCK_ADJUSTMENTS (Phase 3)
   - Fields: product (relation to products), adjustment_type (select: increase, decrease),
             quantity (number), reason (select: damage, loss, found, correction, return, other),
             notes (text), adjusted_by (relation to users),
             previous_stock (number), new_stock (number)
   - Permissions: List/View/Create (authenticated), Update/Delete (admin only)

==============================================
`);

export { suppliersSchema, purchaseOrdersSchema, purchaseOrderItemsSchema, stockAdjustmentsSchema };
