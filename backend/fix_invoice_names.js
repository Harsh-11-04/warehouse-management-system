const mongoose = require('mongoose');
const BillingInvoice = require('./src/models/BillingInvoice.models');
const BillingCustomer = require('./src/models/BillingCustomer.models');

async function fixNames() {
    await mongoose.connect('mongodb://127.0.0.1/inventry');
    
    const invoices = await BillingInvoice.find({ customer: { $ne: null } }).populate('customer');
    
    let updated = 0;
    for (const inv of invoices) {
        if (inv.customer && inv.customer.name && inv.customerName !== inv.customer.name) {
            console.log(`Fixing invoice ${inv.invoiceNumber} from '${inv.customerName}' to '${inv.customer.name}'`);
            inv.customerName = inv.customer.name;
            inv.customerPhone = inv.customer.phone;
            await inv.save();
            updated++;
        }
    }
    
    console.log(`Fixed ${updated} invoices.`);
    mongoose.disconnect();
}

fixNames().catch(console.error);
