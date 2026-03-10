import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function verify() {
    try {
        console.log('Checking inventory count...');
        // Try to fetch one record. If public read is allowed, this works.
        // If 403, we know we need auth.
        const list = await pb.collection('inventory').getList(1, 1);
        console.log(`Inventory Items: ${list.totalItem || list.total}`);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

verify();
