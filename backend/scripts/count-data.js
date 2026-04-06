const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); 

const checkData = async () => {
    try {
        const uri = process.env.MONGO_URI;
        await mongoose.connect(uri);
        
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const names = collections.map(c => c.name);

        console.log(`📡 Connected to ${uri.split('@')[1] || uri}`);
        console.log(`Databases available in Mongoose default db:`);

        for (const col of names) {
            const count = await db.collection(col).countDocuments();
            console.log(`- ${col}: ${count} docs`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking data:', error);
        process.exit(1);
    }
};

checkData();
