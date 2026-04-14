const mongoose = require('mongoose');

const checkDb = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/inventry');
        const db = mongoose.connection.db;
        const users = await db.collection('users').find({ email: { $regex: '^love', $options: 'i' } }).toArray();
        console.log("Users starting with love: ", JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkDb();
