import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function migrateStock() {
    try {
        console.log('Authenticating...');
        try {
            await pb.admins.authWithPassword('admin@example.com', 'password123'); 
        } catch (e) {
            console.log('Default admin login failed. Trying to proceed unauthenticated (reading public data?)...');
        }

        console.log('Fetching locations...');
        let defaultLocation;
        try {
            const locations = await pb.collection('locations').getFullList();
            if (locations.length > 0) {
                defaultLocation = locations[0];
                console.log(`Using existing location: ${defaultLocation.name} (${defaultLocation.id})`);
            } else {
                console.log('No locations found. Creating default "Main Store"...');
                defaultLocation = await pb.collection('locations').create({
                    name: 'Main Store',
                    code: 'MAIN',
                    address: 'Default Address',
                    type: 'store'
                });
            }
        } catch (e) {
            console.error('Error fetching/creating location:', e.message);
            // Don't return, maybe we can't create but we can read? No, location is required for inventory.
            // If location fetch fails, we can't proceed.
            return;
        }

        console.log('Fetching products...');
        const products = await pb.collection('products').getFullList();
        console.log(`Found ${products.length} products to migrate.`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const product of products) {
            const currentStock = product.stock || 0; 
            try {
                // Check existing
                const existing = await pb.collection('inventory').getList(1, 1, {
                    filter: `product="${product.id}" && location="${defaultLocation.id}"`
                });

                if (existing.total > 0) {
                    console.log(`Inventory already exists for ${product.name}, skipping.`);
                    skippedCount++;
                    continue;
                }

                // Create
                await pb.collection('inventory').create({
                    product: product.id,
                    location: defaultLocation.id,
                    quantity: currentStock,
                    reorder_point: product.reorder_point || 10
                });
                console.log(`Migrated ${product.name}: Stock ${currentStock} -> Inventory`);
                migratedCount++;

            } catch (err) {
                console.error(`Failed to migrate ${product.name}:`, err.message);
            }
        }

        console.log('-----------------------------------');
        console.log(`Migration Complete.`);
        console.log(`Migrated: ${migratedCount}`);
        console.log(`Skipped: ${skippedCount}`);

    } catch (e) {
        console.error('Migration failed:', e);
    }
}

migrateStock();
