/// <reference path="../pb_data/types.d.ts" />

/**
 * MIGRATION: Add system timestamp fields to sales_items and inventory_entries
 * 
 * Root Cause: Sorting by '-created' fails with 400 Bad Request because these collections
 * were created without the default system fields.
 */

migrate((app) => {
    console.log('🔧 Adding system fields to sales_items and inventory_entries...');

    const collections = ['sales_items', 'inventory_entries'];

    for (const name of collections) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            let modified = false;

            // Check if fields already exist
            const existingCreated = collection.fields.getByName('created');
            const existingUpdated = collection.fields.getByName('updated');

            if (!existingCreated) {
                collection.fields.addAt(1, new Field({
                    name: 'created',
                    type: 'date',
                    required: true,
                    system: true,
                    hidden: false,
                    presentable: false,
                }));
                console.log(`✅ Added created field to ${name}`);
                modified = true;
            }

            if (!existingUpdated) {
                collection.fields.addAt(2, new Field({
                    name: 'updated',
                    type: 'date',
                    required: true,
                    system: true,
                    hidden: false,
                    presentable: false,
                }));
                console.log(`✅ Added updated field to ${name}`);
                modified = true;
            }

            if (modified) {
                app.save(collection);
                console.log(`✅ Saved updates for ${name}`);
            } else {
                console.log(`ℹ️ ${name} already has system fields`);
            }

        } catch (error) {
            console.warn(`⚠️ Could not add timestamps to ${name}:`, error.message);
        }
    }

}, (app) => {
    console.log('🔄 Rolling back system fields...');

    const collections = ['sales_items', 'inventory_entries'];

    for (const name of collections) {
        try {
            const collection = app.findCollectionByNameOrId(name);

            const createdField = collection.fields.getByName('created');
            if (createdField) {
                collection.fields.removeById(createdField.id);
            }

            const updatedField = collection.fields.getByName('updated');
            if (updatedField) {
                collection.fields.removeById(updatedField.id);
            }

            app.save(collection);
            console.log(`✅ Rolled back fields for ${name}`);
        } catch (error) {
            console.warn(`⚠️ Could not rollback fields for ${name}:`, error.message);
        }
    }
});
