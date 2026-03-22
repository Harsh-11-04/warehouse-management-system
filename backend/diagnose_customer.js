const mongoose = require('mongoose');
const fs = require('fs');
const BillingInvoice = require('./src/models/BillingInvoice.models');
const BillingCustomer = require('./src/models/BillingCustomer.models');

async function check() {
    await mongoose.connect('mongodb://127.0.0.1/inventry');
    
    const invoices = await BillingInvoice.find().sort({createdAt: -1}).limit(3).lean();
    const customers = await BillingCustomer.find().sort({createdAt: -1}).limit(3).lean();

    fs.writeFileSync('diagnose.json', JSON.stringify({ invoices, customers }, null, 2));

    mongoose.disconnect();
}

check().catch(console.error);
