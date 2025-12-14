/// <reference path="../pb_data/types.d.ts" />

/**
 * FIX SUPPLIERS PERMISSIONS FOR POS FUNCTIONALITY
 *
 * Problem: Suppliers collection requires authentication for list/view operations
 * Solution: Allow public read access to suppliers for POS product display
 *
 * This ensures products can display supplier information without requiring login
 */

migrate((app) => {
    const suppliers = app.findCollectionByNameOrId("suppliers");

    // Allow public read access for list and view operations
    // Create/Update/Delete still require appropriate authentication
    suppliers.listRule = "";  // Allow public listing (empty string = public access)
    suppliers.viewRule = "";  // Allow public viewing (empty string = public access)

    // Keep existing create/update/delete rules (require auth and role checks)
    // createRule: "@request.auth.role != 'cashier'" - managers and admins can create
    // updateRule: "@request.auth.role != 'cashier'" - managers and admins can update
    // deleteRule: "@request.auth.role = 'admin'" - only admins can delete

    app.save(suppliers);

    console.log("✅ Fixed suppliers collection permissions - public read access enabled");
}, (app) => {
    // ROLLBACK - Restore original permissions
    const suppliers = app.findCollectionByNameOrId("suppliers");

    suppliers.listRule = "@request.auth.id != ''";
    suppliers.viewRule = "@request.auth.id != ''";

    app.save(suppliers);

    console.log("🔄 Rolled back suppliers collection permissions");
});