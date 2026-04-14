const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');

const CustomerModel = require('./src/models/BillingCustomer.models.js');
const UserModel = require('./src/models/user.models.js');

async function importCustomers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        let user = await UserModel.findOne({ role: 'admin' });
        if (!user) {
            user = await UserModel.findOne({}); 
        }

        if (!user) {
            console.error('No user found in DB to link customers to.');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync('C:\\Users\\harsh\\Downloads\\customers-export (2).json', 'utf8'));

        let processed = 0;
        let created = 0;
        let updated = 0;
        let skipped = 0;
        let skippedReasons = [];

        for (const item of data) {
            processed++;
            
            // Skip fully empty objects
            if (!item.name && !item.phone && !item.email && !item.address) {
                skipped++;
                skippedReasons.push(`Row ${processed}: Fully empty record`);
                continue;
            }

            const phone = item.phone != null ? String(item.phone).trim() : '';

            // DB requires phone.
            if (!phone) {
                skipped++;
                skippedReasons.push(`Row ${processed}: Missing phone number for ${item.name || 'Unknown'}`);
                continue;
            }

            // DB requires name.
            const name = item.name != null ? String(item.name).trim() : '';
            if (!name) {
                skipped++;
                skippedReasons.push(`Row ${processed}: Missing name for phone ${phone}`);
                continue;
            }

            const email = item.email != null ? String(item.email).trim() : '';
            const address = item.address != null ? String(item.address).trim() : '';

            const exists = await CustomerModel.findOne({ phone: phone, user: user._id });
            
            if (exists) {
                exists.name = name;
                exists.email = email;
                exists.address = address;
                await exists.save();
                updated++;
            } else {
                await CustomerModel.create({
                    user: user._id,
                    name,
                    phone,
                    email,
                    address
                });
                created++;
            }
        }

        console.log(`\n--- IMPORT SUMMARY ---`);
        console.log(`Total customers processed: ${processed}`);
        console.log(`Customers created: ${created}`);
        console.log(`Customers updated: ${updated}`);
        console.log(`Customers skipped: ${skipped}`);
        if (skipped > 0) {
            console.log(`Skipped reasons:`);
            skippedReasons.slice(0, 20).forEach(r => console.log(` - ${r}`));
            if (skippedReasons.length > 20) {
                console.log(` ... and ${skippedReasons.length - 20} more.`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error("Migration Error: ", error);
        process.exit(1);
    }
}

importCustomers();
