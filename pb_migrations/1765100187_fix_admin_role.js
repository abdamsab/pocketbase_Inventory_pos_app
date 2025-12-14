/// <reference path="../pb_data/types.d.ts" />

/**
 * FIX: Set admin role for admin user
 *
 * Root Cause: Admin user has undefined role, causing permission failures
 */

migrate((app) => {
    try {
        // Find the admin user
        const adminUsers = app.findRecordsByFilter('_pb_users_auth_', 'email="admin@pos.com"', '', 1, 0);
        if (adminUsers.length > 0) {
            const adminUser = adminUsers[0];
            console.log('🔧 Setting admin role for user:', adminUser.get('email'));

            // Set the role to admin and save
            adminUser.set('role', 'admin');
            app.save(adminUser);

            console.log('✅ Admin user role set to "admin" and saved');
        } else {
            console.log('⚠️ Admin user not found');
        }
    } catch (error) {
        console.log('❌ Error setting admin role:', error.message);
    }
}, (app) => {
    // No rollback needed - this is a fix for missing data
});