const mongoose = require("mongoose");
const { PUBLIC_DATA } = require("./constant");
const BillingProduct = require("./src/models/BillingProduct.models");

async function seedProducts() {
    try {
        await mongoose.connect(PUBLIC_DATA.mongo_uri);
        console.log("Connected to MongoDB");

        // Find a user to assign the products to. Let's just pick the user who owns 'Soap' or the first user.
        let userId;
        const existingProduct = await BillingProduct.findOne();
        if (existingProduct) {
            userId = existingProduct.user;
        } else {
            console.log("No existing products found to copy user ID from. Please ensure at least one user exists.");
            process.exit(1);
        }

        console.log("Using User ID:", userId);

        const products = [
            { name: "Premium Basmati Rice 5kg", category: "Groceries", purchasePrice: 400, mrp: 550, sellingPrice: 500, cardPrice: 480, gstPercent: 5, stock: 50, barcode: "8901234567001" },
            { name: "Organic Toor Dal 1kg", category: "Groceries", purchasePrice: 120, mrp: 180, sellingPrice: 160, cardPrice: 150, gstPercent: 5, stock: 100, barcode: "8901234567002" },
            { name: "Refined Sunflower Oil 1L", category: "Groceries", purchasePrice: 110, mrp: 150, sellingPrice: 140, cardPrice: 135, gstPercent: 5, stock: 80, barcode: "8901234567003" },
            { name: "Whole Wheat Atta 10kg", category: "Groceries", purchasePrice: 320, mrp: 450, sellingPrice: 400, cardPrice: 385, gstPercent: 5, stock: 60, barcode: "8901234567004" },
            { name: "Tata Salt 1kg", category: "Groceries", purchasePrice: 15, mrp: 25, sellingPrice: 22, cardPrice: 20, gstPercent: 0, stock: 200, barcode: "8901234567005" },
            { name: "Maggi 2-Minute Noodles 140g", category: "Snacks", purchasePrice: 20, mrp: 28, sellingPrice: 26, cardPrice: 25, gstPercent: 12, stock: 150, barcode: "8901234567006" },
            { name: "Lays Classic Salted 50g", category: "Snacks", purchasePrice: 15, mrp: 20, sellingPrice: 20, cardPrice: 18, gstPercent: 12, stock: 120, barcode: "8901234567007" },
            { name: "Haldiram's Bhujia Sev 200g", category: "Snacks", purchasePrice: 40, mrp: 55, sellingPrice: 50, cardPrice: 48, gstPercent: 12, stock: 90, barcode: "8901234567008" },
            { name: "Oreo Vanilla Creme Cookies 120g", category: "Snacks", purchasePrice: 25, mrp: 35, sellingPrice: 30, cardPrice: 28, gstPercent: 18, stock: 110, barcode: "8901234567009" },
            { name: "Dairy Milk Silk 60g", category: "Snacks", purchasePrice: 50, mrp: 75, sellingPrice: 70, cardPrice: 65, gstPercent: 18, stock: 85, barcode: "8901234567010" },
            { name: "Coca Cola 1.25L", category: "Beverages", purchasePrice: 45, mrp: 60, sellingPrice: 55, cardPrice: 50, gstPercent: 28, stock: 70, barcode: "8901234567011" },
            { name: "Red Bull Energy Drink 250ml", category: "Beverages", purchasePrice: 85, mrp: 125, sellingPrice: 115, cardPrice: 110, gstPercent: 28, stock: 60, barcode: "8901234567012" },
            { name: "Taj Mahal Tea 250g", category: "Beverages", purchasePrice: 120, mrp: 160, sellingPrice: 150, cardPrice: 140, gstPercent: 5, stock: 95, barcode: "8901234567013" },
            { name: "Nescafe Classic Coffee 50g", category: "Beverages", purchasePrice: 110, mrp: 150, sellingPrice: 145, cardPrice: 135, gstPercent: 18, stock: 105, barcode: "8901234567014" },
            { name: "Tropicana Mixed Fruit Juice 1L", category: "Beverages", purchasePrice: 75, mrp: 100, sellingPrice: 95, cardPrice: 90, gstPercent: 12, stock: 75, barcode: "8901234567015" },
            { name: "Colgate MaxFresh Paste 150g", category: "Personal Care", purchasePrice: 65, mrp: 95, sellingPrice: 85, cardPrice: 80, gstPercent: 18, stock: 130, barcode: "8901234567016" },
            { name: "Dettol Liquid Handwash 200ml", category: "Personal Care", purchasePrice: 70, mrp: 99, sellingPrice: 90, cardPrice: 85, gstPercent: 18, stock: 115, barcode: "8901234567017" },
            { name: "Dove Bar Soap 3x100g", category: "Personal Care", purchasePrice: 120, mrp: 160, sellingPrice: 150, cardPrice: 145, gstPercent: 18, stock: 85, barcode: "8901234567018" },
            { name: "Head & Shoulders Shampoo 340ml", category: "Personal Care", purchasePrice: 200, mrp: 280, sellingPrice: 260, cardPrice: 250, gstPercent: 18, stock: 65, barcode: "8901234567019" },
            { name: "Gillette Mach3 Razor", category: "Personal Care", purchasePrice: 150, mrp: 210, sellingPrice: 195, cardPrice: 185, gstPercent: 18, stock: 55, barcode: "8901234567020" },
            { name: "Vim Liquid Dishwash 500ml", category: "Household", purchasePrice: 75, mrp: 105, sellingPrice: 95, cardPrice: 90, gstPercent: 18, stock: 140, barcode: "8901234567021" },
            { name: "Surf Excel Matic Powder 1kg", category: "Household", purchasePrice: 160, mrp: 220, sellingPrice: 210, cardPrice: 200, gstPercent: 18, stock: 90, barcode: "8901234567022" },
            { name: "Colin Glass Cleaner 500ml", category: "Household", purchasePrice: 65, mrp: 95, sellingPrice: 85, cardPrice: 80, gstPercent: 18, stock: 80, barcode: "8901234567023" },
            { name: "Comfort Fabric Conditioner 860ml", category: "Household", purchasePrice: 150, mrp: 210, sellingPrice: 195, cardPrice: 185, gstPercent: 18, stock: 70, barcode: "8901234567024" },
            { name: "Harpic Toilet Cleaner 1L", category: "Household", purchasePrice: 130, mrp: 180, sellingPrice: 165, cardPrice: 155, gstPercent: 18, stock: 110, barcode: "8901234567025" },
            { name: "Logitech M170 Wireless Mouse", category: "Electronics", purchasePrice: 450, mrp: 699, sellingPrice: 599, cardPrice: 550, gstPercent: 18, stock: 30, barcode: "8901234567026" },
            { name: "SanDisk Cruzer Blade 32GB", category: "Electronics", purchasePrice: 250, mrp: 450, sellingPrice: 350, cardPrice: 320, gstPercent: 18, stock: 45, barcode: "8901234567027" },
            { name: "Boat Bassheads 100 Wired", category: "Electronics", purchasePrice: 200, mrp: 399, sellingPrice: 349, cardPrice: 299, gstPercent: 18, stock: 50, barcode: "8901234567028" },
            { name: "Duracell AA Batteries 4-Pack", category: "Electronics", purchasePrice: 100, mrp: 150, sellingPrice: 140, cardPrice: 130, gstPercent: 18, stock: 100, barcode: "8901234567029" },
            { name: "Xiaomi 10000mAh Power Bank", category: "Electronics", purchasePrice: 650, mrp: 1199, sellingPrice: 999, cardPrice: 899, gstPercent: 18, stock: 25, barcode: "8901234567030" }
        ];

        let count = 0;
        for (const item of products) {
            await BillingProduct.create({ ...item, user: userId });
            count++;
        }

        console.log(`Successfully added ${count} products with card prices.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seedProducts();
