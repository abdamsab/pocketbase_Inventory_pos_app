/// <reference path="../pb_data/types.d.ts" />

/**
 * FINAL FIX: Force correct suppliers permissions (ROOT CAUSE FOUND)
 *
 * Root Cause: Suppliers collection has wrong permissions despite multiple fixes
 * Error: "Only superusers can perform this action" - indicates listRule requires superuser
 *
 * This migration forcibly overrides ALL previous permissions and sets correct auth-based access
 */

migrate((app) => {
    console.log('🔧 FINAL FIX: Forcing correct suppliers permissions...');

    const suppliersCollection = app.findCollectionByNameOrId('suppliers');

    console.log('❌ BROKEN current permissions:', {
        listRule: suppliersCollection.listRule,
        viewRule: suppliersCollection.viewRule,
        createRule: suppliersCollection.createRule,
        updateRule: suppliersCollection.updateRule,
        deleteRule: suppliersCollection.deleteRule,
    });

    // FORCE CORRECT PERMISSIONS - Override everything
    suppliersCollection.listRule = "@request.auth.id != ''";  // Any authenticated user
    suppliersCollection.viewRule = "@request.auth.id != ''";  // Any authenticated user
    suppliersCollection.createRule = "@request.auth.role != 'cashier'";  // Managers/Admins
    suppliersCollection.updateRule = "@request.auth.role != 'cashier'";  // Managers/Admins
    suppliersCollection.deleteRule = "@request.auth.role = 'admin'";     // Admins only

    app.save(suppliersCollection);

    console.log('✅ FIXED permissions applied:', {
        listRule: suppliersCollection.listRule,
        viewRule: suppliersCollection.viewRule,
        createRule: suppliersCollection.createRule,
        updateRule: suppliersCollection.updateRule,
        deleteRule: suppliersCollection.deleteRule,
    });

    console.log('🎯 Suppliers should now be accessible to authenticated users');

}, (app) => {
    console.log('🔄 Rolling back suppliers permissions to authenticated access...');

    const suppliersCollection = app.findCollectionByNameOrId('suppliers');

    suppliersCollection.listRule = "@request.auth.id != ''";
    suppliersCollection.viewRule = "@request.auth.id != ''";
    suppliersCollection.createRule = "@request.auth.role != 'cashier'";
    suppliersCollection.updateRule = "@request.auth.role != 'cashier'";
    suppliersCollection.deleteRule = "@request.auth.role = 'admin'";

    app.save(suppliersCollection);

    console.log('✅ Rolled back to authenticated access permissions');
});