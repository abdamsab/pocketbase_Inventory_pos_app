import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:8090';

async function fetchAndLog(name, url) {
    console.log(`\n--- Fetching ${name} ---`);
    console.log(`URL: ${url}`);

    try {
        const response = await fetch(url);
        console.log(`Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const body = await response.json().catch(() => response.text());
            console.error('Error Body:', JSON.stringify(body, null, 2));
        } else {
            console.log('Success!');
            const body = await response.json();
            console.log(`Returned ${body.items.length} items (Page ${body.page})`);
        }
    } catch (error) {
        console.error('Fetch failed:', error.message);
    }
}

async function run() {
    console.log('Starting API Debug - Final Verification...');

    // 1. Sales Items - Original Failing Query
    await fetchAndLog(
        'Sales Items (Original)',
        `${BASE_URL}/api/collections/sales_items/records?page=1&perPage=100&sort=-created&expand=sale%2Cproduct&fields=*`
    );

    // 2. Inventory Entries - Original Failing Query
    await fetchAndLog(
        'Inventory Entries (Original)',
        `${BASE_URL}/api/collections/inventory_entries/records?page=1&perPage=100&sort=-created&expand=product%2Clocation&fields=*`
    );

    // 3. Sales History - Control
    await fetchAndLog(
        'Sales History (Control)',
        `${BASE_URL}/api/collections/sales/records?page=1&perPage=100&sort=-created&fields=*`
    );
}

run();
