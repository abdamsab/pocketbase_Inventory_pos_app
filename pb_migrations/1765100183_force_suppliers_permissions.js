/// <reference path="../pb_data/types.d.ts" />

/**
 * FORCE FIX: Suppliers permissions - override all previous settings
 *
 * Root Cause: Multiple migrations have conflicting supplier permissions
 * Result: 403 Forbidden errors despite fixes
 *
 * This migration forcibly sets correct permissions for authenticated users
 */

migrate((app) => {
    const suppliersCollection = app.findCollectionByNameOrId('suppliers');

    // FORCE correct permissions - authenticated users can access
    suppliersCollection.listRule = "@request.auth.id != ''";
    suppliersCollection.viewRule = "@request.auth.id != ''";

    // Keep existing create/update/delete permissions
    // createRule: "@request.auth.role != 'cashier'" (managers/admins)
    // updateRule: "@request.auth.role != 'cashier'" (managers/admins)
    // deleteRule: "@request.auth.role = 'admin'" (admins only)

    app.save(suppliersCollection);

}, (app) => {
    const suppliersCollection = app.findCollectionByNameOrId('suppliers');

    suppliersCollection.listRule = "@request.auth.id != ''";
    suppliersCollection.viewRule = "@request.auth.id != ''";
    suppliersCollection.createRule = "@request.auth.role != 'cashier'";
    suppliersCollection.updateRule = "@request.auth.role != 'cashier'";
    suppliersCollection.deleteRule = "@request.auth.role = 'admin'";

    app.save(suppliersCollection);
});