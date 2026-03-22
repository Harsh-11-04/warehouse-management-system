const mongoose = require('mongoose');
const { UserModel } = require('./src/models');

const fixDuplicates = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/inventry');
        console.log('Connected to DB');

        // Force syncing indexes so Mongoose actually creates the unique index if missing
        await UserModel.syncIndexes();
        console.log("Indexes synced.");

        const email = 'user@bill.com';
        const users = await UserModel.find({ email });

        console.log(`Found ${users.length} users with email ${email}`);

        if (users.length > 1) {
            // Keep the first one, delete the rest
            const keepId = users[0]._id;
            console.log(`Keeping user with ID: ${keepId}`);

            const deleteIds = users.slice(1).map(u => u._id);
            await UserModel.deleteMany({ _id: { $in: deleteIds } });
            console.log(`Deleted ${deleteIds.length} duplicate users.`);
        } else {
            console.log("No duplicates found to delete.");
        }

        process.exit(0);
    } catch (error) {
        if (error.code === 11000) {
            // This happens if syncIndexes catches a duplicate before we delete it manually. 
            // We should delete first before sync. So let's handle that case specifically.
            console.error('Duplicate key error during sync. Will manually remove duplicates first.');
            
            const email = 'user@bill.com';
            const users = await UserModel.find({ email });
            if (users.length > 1) {
                const deleteIds = users.slice(1).map(u => u._id);
                await UserModel.deleteMany({ _id: { $in: deleteIds } });
                console.log(`Deleted ${deleteIds.length} duplicate users first.`);
                await UserModel.syncIndexes();
                console.log("Indexes now synced successfully.");
            }
            process.exit(0);
        } else {
            console.error('❌ Error fixing duplicates:', error.message);
            process.exit(1);
        }
    }
};

fixDuplicates();
