/// <reference path="../pb_data/types.d.ts" />

/**
 * VERIFY: Admin user role is correctly set
 */

migrate((app) => {
    try {
        // Check admin user role
        const adminUsers = app.findRecordsByFilter('_pb_users_auth_', 'email="admin@pos.com"', '', 1, 0);
        if (adminUsers.length > 0) {
            const adminUser = adminUsers[0];
            console.log('🔍 VERIFICATION: Admin user role check:');
            console.log('  - Email:', adminUser.email);
            console.log('  - Role:', adminUser.role);
            console.log('  - Verified:', adminUser.verified);

            // Also test suppliers permissions directly
            console.log('🔍 VERIFICATION: Testing suppliers rule evaluation...');

            // Mock request context for rule evaluation
            const mockRequest = {
                auth: {
                    id: adminUser.id,
                    role: adminUser.role
                }
            };

            console.log('  - Mock auth context:', mockRequest.auth);

            // The rule is: "@request.auth.id != ''"
            const listRuleResult = adminUser.id !== '';
            console.log('  - listRule "@request.auth.id != \'\'" evaluates to:', listRuleResult);

            // The rule is: "@request.auth.role != 'cashier'"
            const createRuleResult = adminUser.role !== 'cashier';
            console.log('  - createRule "@request.auth.role != \'cashier\'" evaluates to:', createRuleResult);

        } else {
            console.log('❌ VERIFICATION: No admin user found');
        }
    } catch (error) {
        console.log('❌ VERIFICATION ERROR:', error.message);
    }
}, (app) => {
    // No rollback
});