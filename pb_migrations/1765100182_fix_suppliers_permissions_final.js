/// <reference path="../pb_data/types.d.ts" />

/**
 * FINAL FIX: Correct suppliers collection permissions
 *
 * Root Cause: Suppliers collection returning 403 Forbidden for admin users
 * Issue: Permissions incorrectly set to require superuser access
 *
 * This migration ensures suppliers can be accessed by authenticated users
 */

migrate((app) => {
    console.log('🔧 Fixing suppliers collection permissions for admin access...');

    const suppliersCollection = app.findCollectionByNameOrId('suppliers');

    console.log('Current suppliers permissions:', {
        listRule: suppliersCollection.listRule,
        viewRule: suppliersCollection.viewRule,
        createRule: suppliersCollection.createRule,
        updateRule: suppliersCollection.updateRule,
        deleteRule: suppliersCollection.deleteRule,
    });

    // Set correct permissions for authenticated users
    suppliersCollection.listRule = "@request.auth.id != ''";  // Authenticated users can list
    suppliersCollection.viewRule = "@request.auth.id != ''";  // Authenticated users can view
    // Keep existing create/update/delete rules

    app.save(suppliersCollection);

    console.log('✅ Suppliers collection permissions fixed - authenticated users can now access');
    console.log('New permissions:', {
        listRule: suppliersCollection.listRule,
        viewRule: suppliersCollection.viewRule,
    });

}, (app) => {
    console.log('🔄 Rolling back suppliers permissions...');

    try {
        const suppliersCollection = app.findCollectionByNameOrId('suppliers');
        suppliersCollection.listRule = "";  // Back to public access
        suppliersCollection.viewRule = "";  // Back to public access
        app.save(suppliersCollection);
        console.log('✅ Rolled back suppliers permissions to public access');
    } catch (error) {
        console.warn('⚠️ Could not rollback suppliers permissions:', error.message);
    }
});