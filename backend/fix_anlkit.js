const mongoose = require('mongoose');
const BillingInvoice = require('./src/models/BillingInvoice.models');
const BillingCustomer = require('./src/models/BillingCustomer.models');

async function fixNames() {
    await mongoose.connect('mongodb://127.0.0.1/inventry');
    
    // Fix Customer
    const customer = await BillingCustomer.findOne({ phone: "9149760011" });
    if (customer) {
        customer.name = "anlkit";
        await customer.save();
        console.log("Updated customer name to anlkit.");
    }
    
    // Fix Invoice
    const invoice = await BillingInvoice.findOne({ invoiceNumber: "INV-0002" });
    if (invoice) {
        invoice.customerName = "anlkit";
        await invoice.save();
        console.log("Updated invoice name to anlkit.");
    }

    mongoose.disconnect();
}

fixNames().catch(console.error);
