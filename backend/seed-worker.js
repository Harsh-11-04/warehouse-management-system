const mongoose = require('mongoose');
const { UserModel } = require('./src/models');
const BillingProduct = require("./src/models/BillingProduct.models");

const seedWorkerData = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/inventry');
        console.log('Connected to DB');

        // 1. Create or update the warehouse_staff user
        const email = 'user@bill.com';
        let workerUser = await UserModel.findOne({ email });

        if (!workerUser) {
            console.log(`Creating user ${email}...`);
            workerUser = await UserModel.create({
                email: email,
                password: 'password123',
                name: 'Test Worker',
                role: 'warehouse_staff',
            });
            console.log(`✅ User ${email} created successfully (password: password123)`);
        } else {
            console.log(`User ${email} already exists.`);
        }

        // 2. Add some billing products for this user
        console.log("Seeding test billing products for the new user...");
        const products = [
            { name: "Workers Energy Drink", category: "Beverages", purchasePrice: 40, mrp: 60, sellingPrice: 50, cardPrice: 50, gstPercent: 12, stock: 100, barcode: "9000000000001" },
            { name: "Basic Printer Paper A4", category: "Stationery", purchasePrice: 200, mrp: 350, sellingPrice: 280, cardPrice: 270, gstPercent: 5, stock: 50, barcode: "9000000000002" },
            { name: "Safety Gloves Pack", category: "Accessories", purchasePrice: 150, mrp: 250, sellingPrice: 200, cardPrice: 190, gstPercent: 18, stock: 60, barcode: "9000000000003" },
        ];

        let count = 0;
        for (const item of products) {
            // Check if product already exists to prevent dupes in multiple runs
            const existing = await BillingProduct.findOne({ barcode: item.barcode, user: workerUser._id });
            if (!existing) {
                await BillingProduct.create({ ...item, user: workerUser._id });
                count++;
            }
        }

        console.log(`✅ Successfully added ${count} billing products for user ${email}.`);
        console.log('\n--- Test Credentials ---');
        console.log(`Email: ${email}`);
        console.log(`Password: password123`);
        console.log('------------------------');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding worker data:', error.message);
        process.exit(1);
    }
};

seedWorkerData();
