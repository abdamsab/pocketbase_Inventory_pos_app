/// <reference path="../pb_data/types.d.ts" />

/**
 * FINAL PRODUCTION MIGRATION - MAIN SCHEMA
 * Creates all application collections with complete schemas using CORRECT syntax
 * 
 * IMPORTANT: Relation fields use collectionId and maxSelect directly, NOT in options object!
 * 
 * Collections created:
 * - users (enhanced with role field)
 * - locations, suppliers, categories, products
 * - inventory_entries, sales, sales_items, receipts
 * - purchase_orders, purchase_order_items, stock_adjustments
 * - settings
 * 
 * Date: 2025-12-06
 * Status: PRODUCTION READY ✅
 */

migrate((app) => {
    // ==================== USERS COLLECTION ====================
    const users = app.findCollectionByNameOrId("_pb_users_auth_");
    users.fields.add(new SelectField({
        name: "role",
        required: true,
        values: ["admin", "manager", "cashier"],
        maxSelect: 1
    }));
    app.save(users);

    // ==================== CORE COLLECTIONS ====================

    // 1. LOCATIONS
    const locations = new Collection({
        name: "locations",
        type: "base",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "name", type: "text", required: true },
            { name: "address", type: "text" },
            { name: "code", type: "text", required: true },
            { name: "tax_rate", type: "number" },
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_locations_code ON locations (code)"
        ]
    });
    app.save(locations);

    // 2. SUPPLIERS
    const suppliers = new Collection({
        name: "suppliers",
        type: "base",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role != 'cashier'",
        updateRule: "@request.auth.role != 'cashier'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "name", type: "text", required: true },
            { name: "email", type: "email" },
            { name: "phone", type: "text" },
            { name: "contact_person", type: "text" },
            { name: "address", type: "text" },
            { name: "payment_terms", type: "text" },
            { name: "notes", type: "text" },
            { name: "active", type: "bool" },
        ],
    });
    app.save(suppliers);

    // 3. CATEGORIES
    const categories = new Collection({
        name: "categories",
        type: "base",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role != 'cashier'",
        updateRule: "@request.auth.role != 'cashier'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "name", type: "text", required: true },
        ],
    });
    app.save(categories);

    // Create default categories
    const defaultCategories = ["General", "Electronics", "Clothing", "Food & Beverages", "Home & Garden", "Health & Beauty", "Sports & Outdoors", "Books & Media"];
    defaultCategories.forEach(name => {
        const record = new Record(categories);
        record.set("name", name);
        app.save(record);
    });

    // 4. PRODUCTS
    const products = new Collection({
        name: "products",
        type: "base",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role != 'cashier'",
        updateRule: "@request.auth.role != 'cashier'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "name", type: "text", required: true },
            { name: "sku", type: "text", required: true },
            { name: "barcode", type: "text" },
            { name: "category", type: "relation", required: true, collectionId: categories.id, maxSelect: 1 },
            { name: "cost_price", type: "number", required: true },
            { name: "sale_price", type: "number", required: true },
            { name: "stock", type: "number" },
            { name: "reorder_point", type: "number" },
            { name: "image", type: "file", maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp"] },
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_products_sku ON products (sku)"
        ]
    });
    app.save(products);

    // ==================== SALES COLLECTIONS ====================

    // 5. SALES
    const sales = new Collection({
        name: "sales",
        type: "base",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.role != 'cashier'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "created", type: "date", system: true },
            { name: "updated", type: "date", system: true },
            { name: "sale_number", type: "text", required: true },
            { name: "user", type: "relation", required: true, collectionId: users.id, maxSelect: 1 },
            { name: "location", type: "relation", collectionId: locations.id, maxSelect: 1 },
            { name: "subtotal", type: "number", required: true },
            { name: "tax", type: "number" },
            { name: "discount", type: "number" },
            { name: "total", type: "number", required: true },
            { name: "payment_method", type: "select", required: true, values: ["cash", "card", "mobile"] },
            { name: "status", type: "select", required: true, values: ["completed", "refunded", "cancelled"] },
            { name: "notes", type: "text" },
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_sales_number ON sales (sale_number)"
        ]
    });
    app.save(sales);

    // 6. SALES ITEMS
    const sales_items = new Collection({
        name: "sales_items",
        type: "base",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: null,
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "sale", type: "relation", required: true, collectionId: sales.id, maxSelect: 1, cascadeDelete: true },
            { name: "product", type: "relation", required: true, collectionId: products.id, maxSelect: 1 },
            { name: "quantity", type: "number", required: true },
            { name: "unit_price", type: "number", required: true },
            { name: "total", type: "number", required: true },
        ],
        indexes: [
            "CREATE INDEX idx_sales_items_sale ON sales_items (sale)"
        ]
    });
    app.save(sales_items);

    // 7. RECEIPTS
    const receipts = new Collection({
        name: "receipts",
        type: "base",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: null,
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "sale", type: "relation", required: true, collectionId: sales.id, maxSelect: 1, cascadeDelete: true },
            { name: "receipt_data", type: "json", required: true },
        ],
    });
    app.save(receipts);

    // ==================== INVENTORY COLLECTIONS ====================

    // 8. INVENTORY ENTRIES
    const inventory_entries = new Collection({
        name: "inventory_entries",
        type: "base",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role != 'cashier'",
        updateRule: null,
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "product", type: "relation", required: true, collectionId: products.id, maxSelect: 1 },
            { name: "location", type: "relation", collectionId: locations.id, maxSelect: 1 },
            { name: "type", type: "select", required: true, values: ["purchase", "sale", "adjustment", "transfer"] },
            { name: "quantity", type: "number", required: true },
            { name: "reference_id", type: "text" },
            { name: "notes", type: "text" },
        ],
        indexes: [
            "CREATE INDEX idx_inventory_product ON inventory_entries (product)",
            "CREATE INDEX idx_inventory_type ON inventory_entries (type)"
        ]
    });
    app.save(inventory_entries);

    // ==================== PURCHASE ORDER COLLECTIONS ====================

    // 9. PURCHASE ORDERS
    const purchase_orders = new Collection({
        name: "purchase_orders",
        type: "base",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role != 'cashier'",
        updateRule: "@request.auth.role != 'cashier'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "po_number", type: "text", required: true },
            { name: "supplier", type: "relation", required: true, collectionId: suppliers.id, maxSelect: 1 },
            { name: "order_date", type: "date", required: true },
            { name: "expected_date", type: "date" },
            { name: "status", type: "select", required: true, values: ["draft", "sent", "partial", "received", "cancelled"] },
            { name: "total", type: "number", required: true },
            { name: "notes", type: "text" },
            { name: "created_by", type: "relation", collectionId: users.id, maxSelect: 1 },
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_po_number ON purchase_orders (po_number)"
        ]
    });
    app.save(purchase_orders);

    // 10. PURCHASE ORDER ITEMS
    const purchase_order_items = new Collection({
        name: "purchase_order_items",
        type: "base",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role != 'cashier'",
        updateRule: "@request.auth.role != 'cashier'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "purchase_order", type: "relation", required: true, collectionId: purchase_orders.id, maxSelect: 1, cascadeDelete: true },
            { name: "product", type: "relation", required: true, collectionId: products.id, maxSelect: 1 },
            { name: "quantity_ordered", type: "number", required: true },
            { name: "quantity_received", type: "number" },
            { name: "unit_cost", type: "number", required: true },
            { name: "total", type: "number", required: true },
        ],
        indexes: [
            "CREATE INDEX idx_po_items_po ON purchase_order_items (purchase_order)"
        ]
    });
    app.save(purchase_order_items);

    // 11. STOCK ADJUSTMENTS
    const stock_adjustments = new Collection({
        name: "stock_adjustments",
        type: "base",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role != 'cashier'",
        updateRule: null,
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "product", type: "relation", required: true, collectionId: products.id, maxSelect: 1 },
            { name: "adjustment_type", type: "select", required: true, values: ["add", "remove", "set"] },
            { name: "quantity", type: "number", required: true },
            { name: "reason", type: "text", required: true },
            { name: "adjusted_by", type: "relation", required: true, collectionId: users.id, maxSelect: 1 },
            { name: "notes", type: "text" },
        ],
    });
    app.save(stock_adjustments);

    // ==================== SETTINGS COLLECTION ====================

    // 12. SETTINGS
    const settings = new Collection({
        name: "settings",
        type: "base",
        listRule: "@request.auth.role = 'admin'",
        viewRule: "@request.auth.role = 'admin'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "key", type: "text", required: true },
            { name: "value", type: "json", required: true },
            { name: "description", type: "text" },
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_settings_key ON settings (key)"
        ]
    });
    app.save(settings);

    // Create default settings
    const companySettings = new Record(settings);
    companySettings.set("key", "company_info");
    companySettings.set("value", {
        name: "NexusPOS",
        address: "123 Business St, City, State 12345",
        phone: "+1 (555) 123-4567",
        email: "info@nexuspos.com",
        taxRate: 0.0,
        currency: "USD"
    });
    companySettings.set("description", "Company information and tax settings");
    app.save(companySettings);

}, (app) => {
    // ROLLBACK - Delete all collections in reverse order
    const collectionNames = [
        "settings",
        "stock_adjustments",
        "purchase_order_items",
        "purchase_orders",
        "inventory_entries",
        "receipts",
        "sales_items",
        "sales",
        "products",
        "categories",
        "suppliers",
        "locations"
    ];

    collectionNames.forEach(name => {
        try {
            const collection = app.findCollectionByNameOrId(name);
            app.delete(collection);
        } catch (_) { }
    });

    // Remove role field from users
    try {
        const users = app.findCollectionByNameOrId("_pb_users_auth_");
        const roleField = users.fields.getByName("role");
        if (roleField) {
            users.fields.removeById(roleField.id);
            app.save(users);
        }
    } catch (_) { }
});
