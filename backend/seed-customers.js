const mongoose = require('mongoose');
const { UserModel } = require('./src/models');
const BillingCustomer = require("./src/models/BillingCustomer.models");

const seedCustomers = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/inventry');
        console.log('Connected to DB');

        const email = 'user@bill.com';
        const workerUser = await UserModel.findOne({ email });

        if (!workerUser) {
            console.error(`❌ User ${email} not found! Run seed-worker.js first.`);
            process.exit(1);
        }

        console.log(`Seeding customers for user ${email}...`);

        const customers = [
            { name: 'John Doe', phone: '9876543210', email: 'john@example.com', address: '123 Main St, Springfield', hasCard: true },
            { name: 'Jane Smith', phone: '9123456780', email: 'jane@example.com', address: '456 Oak Avenue, Metropolis', hasCard: false },
            { name: 'Robert Johnson', phone: '9988776655', email: 'robert@example.com', address: '789 Pine Road, Gotham', hasCard: true },
            { name: 'Alice Williams', phone: '9345678901', email: 'alice@example.com', address: '321 Maple Drive, Star City', hasCard: false },
            { name: 'Michael Brown', phone: '9212345678', email: 'michael@example.com', address: '654 Birch Lane, Central City', hasCard: true },
        ];

        let addedCount = 0;
        for (const customer of customers) {
            // Check if customer with this phone number exists for this user
            const existing = await BillingCustomer.findOne({ phone: customer.phone, user: workerUser._id });
            if (!existing) {
                await BillingCustomer.create({ ...customer, user: workerUser._id });
                addedCount++;
            }
        }

        console.log(`✅ Successfully added ${addedCount} customers for user ${email}.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding customers:', error.message);
        process.exit(1);
    }
};

seedCustomers();
