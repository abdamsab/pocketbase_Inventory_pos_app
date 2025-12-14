/// <reference path="../pb_data/types.d.ts" />

/**
 * FIX INVENTORY DISPLAY - MAKE PRODUCTS & CATEGORIES PUBLICLY ACCESSIBLE
 *
 * Problem: Products and categories require authentication, preventing inventory page display
 * Solution: Allow public read access for POS/inventory functionality
 *
 * This enables cashiers to view products and categories without login
 */

migrate((app) => {
    // Fix products collection - allow public read access for POS
    const products = app.findCollectionByNameOrId("products");
    products.listRule = "";  // Allow public listing (empty string = public access)
    products.viewRule = "";  // Allow public viewing (empty string = public access)
    // Keep create/update/delete rules requiring auth and appropriate roles
    app.save(products);

    // Fix categories collection - allow public read access for product categorization
    const categories = app.findCollectionByNameOrId("categories");
    categories.listRule = "";  // Allow public listing (empty string = public access)
    categories.viewRule = "";  // Allow public viewing (empty string = public access)
    // Keep create/update/delete rules requiring auth and appropriate roles
    app.save(categories);

    // Fix inventory_entries collection - allow authenticated users to create entries (for POS sales)
    const inventoryEntries = app.findCollectionByNameOrId("inventory_entries");
    inventoryEntries.createRule = "@request.auth.id != ''";  // Allow any authenticated user to create
    // Keep other rules as they are (list/view require auth, update/delete require manager+)
    app.save(inventoryEntries);

    console.log("✅ Fixed inventory permissions - products, categories publicly accessible, inventory entries allow authenticated creation");
}, (app) => {
    // ROLLBACK - Restore original permissions
    const products = app.findCollectionByNameOrId("products");
    products.listRule = "@request.auth.id != ''";
    products.viewRule = "@request.auth.id != ''";
    app.save(products);

    const categories = app.findCollectionByNameOrId("categories");
    categories.listRule = "@request.auth.id != ''";
    categories.viewRule = "@request.auth.id != ''";
    app.save(categories);

    console.log("🔄 Rolled back inventory permissions");
});