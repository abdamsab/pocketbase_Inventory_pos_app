/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const collection = app.findCollectionByNameOrId("_pb_users_auth_");

    // Ensure 'superuser' field exists
    // We try to retrieve it; if fails/undefined, we add it.
    // Note: JS VM methods might differ. safest is to try adding and catch error?
    // Or check `collection.fields.getByName("superuser")`.

    try {
        const field = collection.fields.getByName("superuser");
    } catch (e) {
        // Field likely missing, add it
        collection.fields.add(new BoolField({
            name: "superuser",
            required: false,
            presentable: false,
            system: false,
            options: {}
        }));
    }

    // Protect sensitive fields (superuser, role)
    // Rule: Admin only OR User themselves (but NOT modifying superuser/role)
    // Note: The :isset suffix check works in updateRule to verify if a field is being set in the request.

    collection.updateRule = `@request.auth.role = 'admin' || (@request.auth.id = id && @request.data.superuser:isset = false && @request.data.role:isset = false)`;

    app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("_pb_users_auth_");
    collection.updateRule = `@request.auth.id = id || @request.auth.role = 'admin'`;
    app.save(collection);
})
