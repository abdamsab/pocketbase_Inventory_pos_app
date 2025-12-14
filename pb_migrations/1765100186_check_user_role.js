/// <reference path="../pb_data/types.d.ts" />

/**
 * CHECK: User authentication and roles
 */

migrate((app) => {
    try {
        // Check admin user
        const adminUsers = app.findRecordsByFilter('_pb_users_auth_', 'email="admin@pos.com"', '', 1, 0);
        console.log('🔍 Admin user check:');
        if (adminUsers.length > 0) {
            const user = adminUsers[0];
            console.log('  - User found:', user.email);
            console.log('  - Role:', user.role);
            console.log('  - Verified:', user.verified);
            console.log('  - All fields:', Object.keys(user));
        } else {
            console.log('  - No admin user found');
        }

        // Check current suppliers permissions again
        const suppliersCollection = app.findCollectionByNameOrId('suppliers');
        console.log('🔍 Current suppliers permissions:');
        console.log('  - listRule:', suppliersCollection.listRule);
        console.log('  - viewRule:', suppliersCollection.viewRule);
        console.log('  - createRule:', suppliersCollection.createRule);
        console.log('  - updateRule:', suppliersCollection.updateRule);
        console.log('  - deleteRule:', suppliersCollection.deleteRule);

    } catch (error) {
        console.log('Error:', error.message);
    }
}, (app) => {
    // No rollback
});