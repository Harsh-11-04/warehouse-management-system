require('dotenv').config();
const mongoose = require('mongoose');
const BillingInvoice = require('../src/models/BillingInvoice.models');
const BillingProduct = require('../src/models/BillingProduct.models');

async function syncMRP() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");

        const invoices = await BillingInvoice.find({});
        console.log(`Found ${invoices.length} invoices to process...`);
        let updatedCount = 0;

        for (const invoice of invoices) {
            let modified = false;

            for (let i = 0; i < invoice.items.length; i++) {
                const item = invoice.items[i];
                
                // If MRP is 0 or missing
                if (!item.mrp) {
                    // Try to find product
                    let product = await BillingProduct.findById(item.product);
                    
                    // If not found by ID, try barcode if it exists
                    if (!product && item.barcode) {
                        product = await BillingProduct.findOne({ barcode: item.barcode });
                    }

                    if (product && product.mrp > 0) {
                        item.mrp = product.mrp;
                        modified = true;
                    }
                }
            }

            if (modified) {
                // Ensure mongoose catches the array change
                invoice.markModified('items');
                await invoice.save();
                updatedCount++;
                console.log(`Updated invoice ${invoice.invoiceNumber}`);
            }
        }

        console.log(`\nSync complete! Updated ${updatedCount} invoices.`);
    } catch (error) {
        console.error("Error occurred:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

syncMRP();
