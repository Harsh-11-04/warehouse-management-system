const mongoose = require('mongoose');
const fs = require('fs');

const searchAll = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/inventry');
        const db = mongoose.connection.db;
        
        let output = [];
        const collections = await db.listCollections().toArray();
        for (let col of collections) {
            const docs = await db.collection(col.name).find({}).toArray();
            for (let doc of docs) {
                const str = JSON.stringify(doc).toLowerCase();
                if (str.includes('love')) {
                    output.push({ collection: col.name, document: doc });
                }
            }
        }
        fs.writeFileSync('found.json', JSON.stringify(output, null, 2));
        console.log('Saved to found.json');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

searchAll();
