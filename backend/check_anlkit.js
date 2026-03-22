const mongoose = require('mongoose');
const BillingInvoice = require('./src/models/BillingInvoice.models');
const BillingCustomer = require('./src/models/BillingCustomer.models');

async function check() {
    await mongoose.connect('mongodb://127.0.0.1/inventry');
    
    const customer = await BillingCustomer.findOne({ phone: "9149760011" }).lean();
    console.log("Customer:");
    console.log(customer);

    const invoice = await BillingInvoice.findOne({ invoiceNumber: "INV-0002" }).lean();
    console.log("\nInvoice:");
    console.log(invoice);

    mongoose.disconnect();
}

check().catch(console.error);
