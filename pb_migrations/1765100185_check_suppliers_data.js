/// <reference path="../pb_data/types.d.ts" />

/**
 * CHECK: Suppliers data and fields
 */

migrate((app) => {
    try {
        const records = app.findRecordsByFilter('suppliers', 'id != ""', '', 10, 0);
        console.log('🔍 Suppliers records count:', records.length);
        if (records.length > 0) {
            console.log('Sample record fields:', Object.keys(records[0]));
            console.log('Sample record:', records[0]);
        }
    } catch (error) {
        console.log('Error checking suppliers:', error.message);
    }
}, (app) => {
    // No rollback needed
});