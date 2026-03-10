/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Update 'locations' collection: Add 'type'
    try {
        const locations = app.findCollectionByNameOrId("locations");
        if (!locations.fields.getByName("type")) {
            locations.fields.add(new SelectField({
                name: "type",
                options: {
                    maxSelect: 1,
                    values: ["store", "warehouse"],
                },
                required: true,
            }));
            app.save(locations);
        }
    } catch (e) {
        console.log("Error updating locations: " + e);
    }

    // 2. Create 'customers' collection
    try {
        app.findCollectionByNameOrId("customers");
    } catch (e) {
        // Collection doesn't exist, create it
        const customers = new Collection({
            name: "customers",
            type: "base",
            fields: [
                new Field({ name: "name", type: "text", required: true }),
                new Field({ name: "email", type: "email" }),
                new Field({ name: "phone", type: "text" }),
                new Field({ name: "address", type: "text" }),
                new Field({ name: "total_spent", type: "number" }),
                new Field({ name: "last_visit", type: "date" }),
            ],
        });
        app.save(customers);
    }

    // 3. Create 'inventory' collection
    try {
        app.findCollectionByNameOrId("inventory");
    } catch (e) {
        const productsRef = app.findCollectionByNameOrId("products");
        const locationsRef = app.findCollectionByNameOrId("locations");

        const inventory = new Collection({
            name: "inventory",
            type: "base",
            fields: [
                new Field({ name: "quantity", type: "number", required: true }),
                new Field({ name: "reorder_point", type: "number" }),
                new Field({ name: "product", type: "relation", required: true, collectionId: productsRef.id, cascadeDelete: true, maxSelect: 1 }),
                new Field({ name: "location", type: "relation", required: true, collectionId: locationsRef.id, cascadeDelete: true, maxSelect: 1 }),
            ],
            indexes: [
                "CREATE UNIQUE INDEX `idx_inventory_product_location` ON `inventory` (`product`, `location`)"
            ]
        });
        app.save(inventory);
    }

    // 4. Update 'users' collection: Add 'locations' (multi) and 'superuser'
    try {
        const users = app.findCollectionByNameOrId("users");
        // Re-fetch locations to get ID safely
        const locationsRef = app.findCollectionByNameOrId("locations");

        let usersChanged = false;
        if (!users.fields.getByName("locations")) {
            users.fields.add(new Field({
                name: "locations",
                type: "relation",
                collectionId: locationsRef.id,
                cascadeDelete: false,
                maxSelect: null, // Allow multiple locations
            }));
            usersChanged = true;
        }
        if (!users.fields.getByName("superuser")) {
            users.fields.add(new Field({
                name: "superuser",
                type: "bool",
            }));
            usersChanged = true;
        }
        if (usersChanged) app.save(users);
    } catch (e) {
        console.log("Error updating users: " + e);
    }

    // 5. Update Transaction Collections
    const locationsRef = app.findCollectionByNameOrId("locations");
    const usersRef = app.findCollectionByNameOrId("users");
    const customersRef = app.findCollectionByNameOrId("customers");

    // Helper to add location/user fields safely
    const addTransactionFields = (collectionName) => {
        try {
            const col = app.findCollectionByNameOrId(collectionName);
            let changed = false;

            // Add 'location' if not exists
            if (!col.fields.getByName("location")) {
                col.fields.add(new Field({
                    name: "location",
                    type: "relation",
                    required: true,
                    collectionId: locationsRef.id,
                    cascadeDelete: false,
                    maxSelect: 1
                }));
                changed = true;
            }

            // Add 'user' if not exists
            if (!col.fields.getByName("user")) {
                col.fields.add(new Field({
                    name: "user",
                    type: "relation",
                    required: true,
                    collectionId: usersRef.id,
                    cascadeDelete: false,
                    maxSelect: 1
                }));
                changed = true;
            }

            if (changed) app.save(col);
        } catch (e) {
            console.log(`Skipping ${collectionName} update: ${e.message}`);
        }
    };

    addTransactionFields("sales");
    addTransactionFields("sales_items");
    addTransactionFields("inventory_entries");
    addTransactionFields("purchase_orders");

    // 6. Add 'customer' to 'sales'
    try {
        const sales = app.findCollectionByNameOrId("sales");
        if (!sales.fields.getByName("customer")) {
            sales.fields.add(new Field({
                name: "customer",
                type: "relation",
                collectionId: customersRef.id,
                cascadeDelete: false,
                maxSelect: 1
            }));
            app.save(sales);
        }
    } catch (e) {
        console.log("Error updating sales customer: " + e);
    }

}, (app) => {
    // Revert operations (simplified)
    // Note: The original down migration was simplified and did not fully revert all changes.
    // For a complete revert, each change in the up migration would need a corresponding down operation.
    // For example, removing fields from collections is generally not recommended in down migrations
    // without careful data handling.
    const dao = new Dao(app); // Still using Dao in down migration as per original structure

    try {
        const inventory = dao.findCollectionByNameOrId("inventory");
        dao.deleteCollection(inventory);
    } catch (_) { }

    try {
        const customers = dao.findCollectionByNameOrId("customers");
        dao.deleteCollection(customers);
    } catch (_) { }

    // Note: removing fields from existing collections is riskier in 'down' migrations 
    // without careful data handling, so usually we just leave them or would need verbose logic.
});
