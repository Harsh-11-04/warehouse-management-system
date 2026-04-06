const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); 

const clearCloudData = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error("Could not find MONGO_URI in .env file!");
        
        console.log(`📡 Connecting to Cloud Database: ${uri.split('@')[1] || uri}`);
        
        await mongoose.connect(uri);
        console.log('✅ Connected to Cloud DB successfully.\n');

        const db = mongoose.connection.db;
        const existingCollections = await db.listCollections().toArray();
        const existingNames = existingCollections.map(c => c.name);

        console.log('🗑️ Wiping collections for a completely fresh start...');

        let droppedCount = 0;
        for (const colName of existingNames) {
            // Keep users so the login still works
            if (colName === 'users') {
                console.log(`🛡️  Kept collection: ${colName}`);
                continue;
            }

            await db.collection(colName).deleteMany({});
            console.log(`✅ Emptied collection: ${colName}`);
            droppedCount++;
        }

        console.log(`\n🎉 COMPLETELY FLUSHED ${droppedCount} COLLECTIONS.`);
        console.log('✅ The Cloud Cashier App is now a BLANK SLATE (Invoices, Customers, and Products removed).');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        process.exit(1);
    }
};

clearCloudData();
