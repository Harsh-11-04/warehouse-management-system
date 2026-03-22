const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/inventry';
const ATLAS_URI = 'mongodb+srv://harshpawar458_db_user:bg0VsVI6vztcTBpC@jaat-canteen.k7wsnc6.mongodb.net/?appName=Jaat-Canteen';

async function migrate() {
    console.log('[Migration] Starting migration process...');

    console.log('[Migration] Connecting to Local Database...');
    const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('[Migration] Local DB connected successfully.');

    console.log('[Migration] Connecting to Atlas Database...');
    const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('[Migration] Atlas DB connected successfully.');

    try {
        const localDb = localConn.db;
        const atlasDb = atlasConn.db;

        const collections = await localDb.listCollections().toArray();
        console.log(`[Migration] Found ${collections.length} collections to process.`);

        for (const col of collections) {
            const colName = col.name;
            if (colName === 'system.indexes' || colName.startsWith('system.')) continue;

            console.log(`\n[Migration] Processing collection: ${colName}...`);
            const docs = await localDb.collection(colName).find({}).toArray();
            
            if (docs.length > 0) {
                // Clear existing in Atlas to avoid duplicates and ensure a fresh copy
                await atlasDb.collection(colName).deleteMany({});
                
                // Insert documents
                await atlasDb.collection(colName).insertMany(docs);
                console.log(`[Migration]   -> Successfully imported ${docs.length} documents.`);
            } else {
                console.log(`[Migration]   -> Empty collection, skipping.`);
            }
        }

        console.log('\n[Migration] 🎉 All data successfully migrated to Atlas!');

    } catch (e) {
        console.error('[Migration Error]', e);
    } finally {
        await localConn.close();
        await atlasConn.close();
        process.exit(0);
    }
}

migrate();
