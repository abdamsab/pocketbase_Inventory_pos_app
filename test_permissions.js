const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://127.0.0.1:8090');

// Try to authenticate as admin
async function testPermissions() {
    try {
        console.log('🔍 Testing supplier permissions...');

        // Try to authenticate
        await pb.collection('users').authWithPassword('admin@pos.com', 'password123');
        console.log('✅ Authentication successful');

        // Check auth store
        console.log('Auth store:', {
            isValid: pb.authStore.isValid,
            token: pb.authStore.token ? 'present' : 'missing',
            model: pb.authStore.model ? { email: pb.authStore.model.email, role: pb.authStore.model.role } : null
        });

        // Try to get suppliers
        const suppliers = await pb.collection('suppliers').getFullList();
        console.log('✅ Suppliers access successful:', suppliers.length, 'records');

    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Full error:', error);
        console.log('Response data:', error.response?.data);
    }
}

testPermissions();