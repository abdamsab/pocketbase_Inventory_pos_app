/// <reference path="../pb_data/types.d.ts" />

/**
 * DEBUG: Check current suppliers collection permissions
 *
 * This migration logs the current state of suppliers permissions
 * to diagnose the 403 Forbidden issue
 */

migrate((app) => {
    const suppliersCollection = app.findCollectionByNameOrId('suppliers');

    console.log('🔍 DEBUG: Current suppliers collection permissions:');
    console.log('  - listRule:', suppliersCollection.listRule);
    console.log('  - viewRule:', suppliersCollection.viewRule);
    console.log('  - createRule:', suppliersCollection.createRule);
    console.log('  - updateRule:', suppliersCollection.updateRule);
    console.log('  - deleteRule:', suppliersCollection.deleteRule);

    // Check if collection exists and has data
    try {
        const records = app.findRecordsByFilter('suppliers', 'id != ""', '', 1, 0);
        console.log('  - Records count:', records.length);
        if (records.length > 0) {
            console.log('  - Sample record ID:', records[0].id);
            console.log('  - Sample record fields:', Object.keys(records[0]));
        }
    } catch (error) {
        console.log('  - Error checking records:', error.message);
    }

    // Don't modify anything, just log
    return app.save(suppliersCollection);
}, (app) => {
    // Rollback - no changes made
    console.log('🔄 DEBUG migration rolled back');
});