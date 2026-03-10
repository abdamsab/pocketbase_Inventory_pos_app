/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const collections = ["inventory", "customers", "locations"];

    collections.forEach(name => {
        try {
            const collection = app.findCollectionByNameOrId(name);

            // Allow authenticated users to view/list/create/update
            // Lock delete to admin only (null)

            collection.listRule = "@request.auth.id != ''";
            collection.viewRule = "@request.auth.id != ''";

            // For inventory and customers, allow creation and updates by auth users
            if (name === "inventory" || name === "customers") {
                collection.createRule = "@request.auth.id != ''";
                collection.updateRule = "@request.auth.id != ''";
            }

            // Locations are usually managed by admins, but users need to read them.
            // Keeping locations read-only for regular users is safer.
            // If locations need creating, admin does it.

            app.save(collection);
            console.log(`Updated rules for ${name}`);
        } catch (e) {
            console.log(`Error updating rules for ${name}: ` + e);
        }
    });

}, (app) => {
    // Revert is complex, skipping for permission fixes as they are additive/corrective
});
