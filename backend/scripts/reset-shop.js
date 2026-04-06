const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Ensure it catches .env

const clearShopData = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventry';
        console.log(`Connecting to: ${uri}`);
        
        await mongoose.connect(uri);
        console.log('Connected to DB successfully.\n');

        const db = mongoose.connection.db;

        // The collections we want to drop or empty
        const collectionsToClear = [
            'billinginvoices',
            'billingcustomers',
            'syncoutboxes',
            'syncstates',
            'cloudsales',
            'cloudsyncaudits',
            'cloudinventorymovements',
            'orders',
            'shipments',
            'activitylogs',
            'stockhistories'
        ];

        const existingCollections = await db.listCollections().toArray();
        const existingNames = existingCollections.map(c => c.name);

        for (const colName of collectionsToClear) {
            if (existingNames.includes(colName)) {
                await db.collection(colName).deleteMany({});
                console.log(`✅ Cleared collection: ${colName}`);
            } else {
                console.log(`⏭️  Skipped collection (does not exist): ${colName}`);
            }
        }

        console.log('\n🎉 ALL PREVIOUS TRANSACTIONAL DATA HAS BEEN ERASED.');
        console.log('✅ The Cashier App is now ready for a fresh start. (Products and Admins were kept)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        process.exit(1);
    }
};

clearShopData();
