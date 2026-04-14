const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const createUser = async () => {
    try {
        const uri = 'mongodb+srv://harshpawar458_db_user:bg0VsVI6vztcTBpC@jaat-canteen.k7wsnc6.mongodb.net/?appName=Jaat-Canteen';
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        const email = 'loveshop@billing.com';
        const rawPassword = 'Love@2026';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // Optional: try to grab a shopId from another user if needed, or leave it null
        // (If the cashier needs a shopId to work in the UI, we can fetch one)
        const anotherUser = await usersCollection.findOne({});
        const shopId = anotherUser ? anotherUser.shopId : null;

        const result = await usersCollection.updateOne(
            { email: email },
            { 
                $set: {
                    name: 'Love Shop Cashier',
                    password: hashedPassword,
                    role: 'warehouse_staff',
                    shopId: shopId,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );

        if (result.matchedCount > 0) {
            console.log('User already existed and was updated.');
        } else {
            console.log('New user created successfully.');
        }

        console.log('✅ Name: Love Shop Cashier');
        console.log(`✅ Email: ${email}`);
        console.log(`✅ Password: ${rawPassword}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createUser();
