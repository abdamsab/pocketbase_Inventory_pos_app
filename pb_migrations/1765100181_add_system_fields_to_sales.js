/// <reference path="../pb_data/types.d.ts" />

/**
 * MIGRATION: Add system timestamp fields to sales collection AND fix suppliers permissions
 *
 * Root Cause: Multiple issues with collections
 * 1. Sales collection missing created/updated system fields
 * 2. Suppliers collection has incorrect permissions (403 Forbidden)
 *
 * This migration fixes both issues
 */

migrate((app) => {
    console.log('🔧 Fixing sales and suppliers collections...');

    // 1. Fix suppliers permissions
    try {
        const suppliersCollection = app.findCollectionByNameOrId('suppliers');
        console.log('Current suppliers permissions:', {
            listRule: suppliersCollection.listRule,
            viewRule: suppliersCollection.viewRule,
        });

        // Set proper permissions for authenticated users
        suppliersCollection.listRule = "@request.auth.id != ''";
        suppliersCollection.viewRule = "@request.auth.id != ''";

        app.save(suppliersCollection);
        console.log('✅ Fixed suppliers collection permissions');
    } catch (error) {
        console.warn('⚠️ Could not fix suppliers permissions:', error.message);
    }

    // 2. Add system timestamp fields to sales collection
    try {
        const salesCollection = app.findCollectionByNameOrId('sales');

        // Check if fields already exist
        const existingCreated = salesCollection.fields.getByName('created');
        const existingUpdated = salesCollection.fields.getByName('updated');

        if (!existingCreated) {
            salesCollection.fields.addAt(1, new Field({
                name: 'created',
                type: 'date',
                required: true,
                system: true,
                hidden: false,
                presentable: false,
            }));
            console.log('✅ Added created field to sales collection');
        }

        if (!existingUpdated) {
            salesCollection.fields.addAt(2, new Field({
                name: 'updated',
                type: 'date',
                required: true,
                system: true,
                hidden: false,
                presentable: false,
            }));
            console.log('✅ Added updated field to sales collection');
        }

        app.save(salesCollection);
        console.log('✅ Sales collection updated with timestamp fields');

    } catch (error) {
        console.warn('⚠️ Could not add timestamp fields to sales:', error.message);
    }

}, (app) => {
    console.log('🔄 Rolling back collection fixes...');

    // Rollback suppliers permissions
    try {
        const suppliersCollection = app.findCollectionByNameOrId('suppliers');
        suppliersCollection.listRule = "";
        suppliersCollection.viewRule = "";
        app.save(suppliersCollection);
        console.log('✅ Rolled back suppliers permissions');
    } catch (error) {
        console.warn('⚠️ Could not rollback suppliers permissions:', error.message);
    }

    // Rollback sales timestamp fields
    try {
        const salesCollection = app.findCollectionByNameOrId('sales');

        const createdField = salesCollection.fields.getByName('created');
        if (createdField) {
            salesCollection.fields.removeById(createdField.id);
        }

        const updatedField = salesCollection.fields.getByName('updated');
        if (updatedField) {
            salesCollection.fields.removeById(updatedField.id);
        }

        app.save(salesCollection);
        console.log('✅ Rolled back sales timestamp fields');

    } catch (error) {
        console.warn('⚠️ Could not rollback sales timestamp fields:', error.message);
    }
});