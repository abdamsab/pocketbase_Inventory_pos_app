/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const collection = app.findCollectionByNameOrId("sales");

    const field = collection.fields.getByName("payment_method");
    if (field) {
        // Add 'bank_transfer' to the existing options
        const options = field.values;
        if (!options.includes("bank_transfer")) {
            options.push("bank_transfer");
            field.values = options;
            app.save(collection);
        }
    }
}, (app) => {
    const collection = app.findCollectionByNameOrId("sales");

    const field = collection.fields.getByName("payment_method");
    if (field) {
        // Remove 'bank_transfer' from options
        const options = field.values;
        const index = options.indexOf("bank_transfer");
        if (index > -1) {
            options.splice(index, 1);
            field.values = options;
            app.save(collection);
        }
    }
});
