/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    // 1. Fix 'customers' collection
    try {
        const customers = app.findCollectionByNameOrId("customers");
        let changed = false;

        // Add fields if they don't exist
        if (!customers.fields.getByName("name")) {
            customers.fields.add(new Field({ name: "name", type: "text", required: true }));
            changed = true;
        }
        if (!customers.fields.getByName("email")) {
            customers.fields.add(new Field({ name: "email", type: "email" }));
            changed = true;
        }
        if (!customers.fields.getByName("phone")) {
            customers.fields.add(new Field({ name: "phone", type: "text" }));
            changed = true;
        }
        if (!customers.fields.getByName("address")) {
            customers.fields.add(new Field({ name: "address", type: "text" }));
            changed = true;
        }
        if (!customers.fields.getByName("total_spent")) {
            customers.fields.add(new Field({ name: "total_spent", type: "number" }));
            changed = true;
        }
        if (!customers.fields.getByName("last_visit")) {
            customers.fields.add(new Field({ name: "last_visit", type: "date" }));
            changed = true;
        }

        if (changed) {
            app.save(customers);
            console.log("Fixed customers schema.");
        }
    } catch (e) {
        console.log("Error fixing customers: " + e);
    }

    // 2. Fix 'inventory' collection
    try {
        const inventory = app.findCollectionByNameOrId("inventory");
        const products = app.findCollectionByNameOrId("products");
        const locations = app.findCollectionByNameOrId("locations");
        let changed = false;

        if (!inventory.fields.getByName("quantity")) {
            inventory.fields.add(new Field({ name: "quantity", type: "number", required: true }));
            changed = true;
        }
        if (!inventory.fields.getByName("reorder_point")) {
            inventory.fields.add(new Field({ name: "reorder_point", type: "number" }));
            changed = true;
        }
        if (!inventory.fields.getByName("product")) {
            inventory.fields.add(new Field({
                name: "product",
                type: "relation",
                required: true,
                collectionId: products.id,
                cascadeDelete: true,
                maxSelect: 1
            }));
            changed = true;
        }
        if (!inventory.fields.getByName("location")) {
            inventory.fields.add(new Field({
                name: "location",
                type: "relation",
                required: true,
                collectionId: locations.id,
                cascadeDelete: true,
                maxSelect: 1
            }));
            changed = true;
        }

        // Add Index if missing (trying to add again is safe? SDK usually handles unique names but let's try)
        // Note: app.save(inventory) updates the collection config including indexes.
        // We'll just define it, if it exists it might error or be ignored.
        // Checking indexes is harder via JS API, but we'll try adding it to the array if length is 0.
        if (inventory.indexes.length === 0) {
            inventory.indexes.push("CREATE UNIQUE INDEX `idx_inventory_product_location` ON `inventory` (`product`, `location`)");
            changed = true;
        }

        if (changed) {
            app.save(inventory);
            console.log("Fixed inventory schema.");
        }

        // 3. Re-run Data Migration for Inventory
        // Since schema was broken, previous data is likely bad (missing fields).
        // Strategy: Clear all inventory, then populate from products.

        // Delete existing (bad) records
        const existingInventory = app.findRecordsByFilter("inventory", "id != ''");
        for (const record of existingInventory) {
            app.delete(record);
        }
        console.log(`Cleared ${existingInventory.length} bad inventory records.`);

        // Find Main Location (Store)
        let mainLocation;
        try {
            mainLocation = app.findFirstRecordByFilter("locations", "name ~ 'Store' || type = 'store'");
        } catch (e) {
            // If no store, try any
            const allLocs = app.findAllRecords("locations");
            if (allLocs.length > 0) mainLocation = allLocs[0];
        }

        if (mainLocation) {
            const allProducts = app.findAllRecords("products");
            for (const product of allProducts) {
                const stock = product.getInt("stock");
                // Create inventory record
                const invRecord = new Record(inventory);
                invRecord.set("product", product.id);
                invRecord.set("location", mainLocation.id);
                invRecord.set("quantity", stock);
                invRecord.set("reorder_point", product.getInt("reorder_point") || 10);
                app.save(invRecord);
            }
            console.log(`Re-migrated stock for ${allProducts.length} products to location: ${mainLocation.getString("name")}`);
        } else {
            console.warn("No location found to migrate stock to!");
        }

    } catch (e) {
        console.log("Error fixing inventory: " + e);
    }

}, (app) => {
    // Revert logic (optional, but good practice)
    // We won't remove fields in revert to avoid data loss, just logging.
    console.log("Revert of fix_schema_and_data not implemented to preserve data.");
});
