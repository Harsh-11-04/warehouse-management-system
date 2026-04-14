const mongoose = require('mongoose');

const searchAll = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/inventry');
        const db = mongoose.connection.db;
        
        const collections = await db.listCollections().toArray();
        for (let col of collections) {
            const docs = await db.collection(col.name).find({}).toArray();
            for (let doc of docs) {
                const str = JSON.stringify(doc).toLowerCase();
                if (str.includes('love')) {
                    console.log(`Found in collection ${col.name}:`, doc);
                }
            }
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

searchAll();
