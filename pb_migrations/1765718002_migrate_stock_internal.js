/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Get Default Location
    let defaultLocation;
    try {
        const locations = app.findRecordsByFilter("locations", "code = 'MAIN'", "", 1);
        if (locations.length > 0) {
            defaultLocation = locations[0];
        } else {
            // Check if any location exists
            const all = app.findRecordsByFilter("locations", "1=1", "", 1);
            if (all.length > 0) {
                defaultLocation = all[0];
            } else {
                // Create default
                const collection = app.findCollectionByNameOrId("locations");
                defaultLocation = new Record(collection);
                defaultLocation.set("name", "Main Store");
                defaultLocation.set("code", "MAIN");
                defaultLocation.set("type", "store");
                defaultLocation.set("address", "Default");
                app.save(defaultLocation);
            }
        }
    } catch (e) {
        console.log("Error finding/creating location: " + e);
        return;
    }

    // 2. Iterate Products
    try {
        // Fetch products (limit to 1000 or paginate if needed, but for migration loop is okay if not too huge)
        // JS engine in PB can handle large arrays, but pagination is safer. 
        // For now, let's assume reasonable size or use findRecordsByFilter with limit.
        const products = app.findRecordsByFilter("products", "1=1", "", 5000);
        const inventoryCollection = app.findCollectionByNameOrId("inventory");

        for (const product of products) {
            // Safe stock access via .get() or property? 
            // 1765100186 showed `user.email`. So `product.stock` matches.
            let qty = 0;
            try {
                // Note: user.email is a string. product.stock is a number.
                // Goja should handle this.
                qty = product.getInt("stock");
            } catch (e) {
                // Fallback if getInt fails
                qty = product.stock || 0;
            }

            const productId = product.id;
            const locationId = defaultLocation.id;

            // Check if exists
            try {
                const existing = app.findRecordsByFilter("inventory", `product='${productId}' && location='${locationId}'`, "", 1);
                if (existing.length > 0) continue;
            } catch (_) { }

            // Create Inventory Record
            const inv = new Record(inventoryCollection);
            inv.set("product", productId);
            inv.set("location", locationId);
            inv.set("quantity", qty);
            inv.set("reorder_point", product.getInt("reorder_point") || 10);

            app.save(inv);
        }
    } catch (e) {
        console.log("Migration error in 1765718002: " + e);
    }

}, (app) => {
    // Down migration: We could delete inventory, but let's keep it safe.
});
