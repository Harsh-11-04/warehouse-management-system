/**
 * Seed script: Adds demo products, warehouses, and stock for testing
 * Run: node scripts/seed-demo-products.js
 * Or: npm run seed
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { PUBLIC_DATA } = require("../constant");
const UserModel = require("../src/models/user.models");
const ProductModel = require("../src/models/Product.models");
const WarehouseModel = require("../src/models/Warehouse.models");
const StorageLocationModel = require("../src/models/StorageLocation.models");
const StockLocationModel = require("../src/models/StockLocation.models");
const ProductService = require("../src/services/Product.service");

const DEMO_PRODUCTS = [
  { name: "Wireless Bluetooth Headphones", sku: "WBH-001", category: "Electronics", price: 89.99, totalQuantity: 150, reorderThreshold: 20 },
  { name: "USB-C Charging Cable 6ft", sku: "UCC-002", category: "Electronics", price: 12.99, totalQuantity: 320, reorderThreshold: 50 },
  { name: "Ergonomic Office Chair", sku: "EOC-003", category: "Furniture", price: 249.99, totalQuantity: 45, reorderThreshold: 10 },
  { name: "Standing Desk Adjustable", sku: "SDA-004", category: "Furniture", price: 399.99, totalQuantity: 28, reorderThreshold: 5 },
  { name: "Stainless Steel Water Bottle 32oz", sku: "SSW-005", category: "Accessories", price: 24.99, totalQuantity: 200, reorderThreshold: 30 },
  { name: "Mechanical Keyboard RGB", sku: "MKR-006", category: "Electronics", price: 129.99, totalQuantity: 75, reorderThreshold: 15 },
  { name: "Wireless Mouse Ergonomic", sku: "WME-007", category: "Electronics", price: 49.99, totalQuantity: 180, reorderThreshold: 25 },
  { name: "Monitor Stand Dual", sku: "MSD-008", category: "Furniture", price: 79.99, totalQuantity: 60, reorderThreshold: 12 },
  { name: "Laptop Sleeve 15\"", sku: "LSS-009", category: "Accessories", price: 34.99, totalQuantity: 95, reorderThreshold: 20 },
  { name: "Desk Organizer Set", sku: "DOS-010", category: "Office Supplies", price: 19.99, totalQuantity: 5, reorderThreshold: 15 },
];

const DEMO_WAREHOUSES = [
  { name: "Main Warehouse - Building A", address: "123 Industrial Blvd, Suite 100" },
  { name: "Distribution Center - East", address: "456 Commerce Dr, Unit 5" },
];

async function seed() {
  try {
    await mongoose.connect(PUBLIC_DATA.mongo_uri);
    console.log("Connected to MongoDB:", mongoose.connection.host);

    // Get first admin user
    const user = await UserModel.findOne().lean();
    if (!user) {
      console.error("No users found. Please register first at /register, then run this seed.");
      process.exit(1);
    }
    const userId = user._id;
    console.log("Seeding for user:", user.email);

    // 1. Create demo products
    const createdProducts = [];
    for (const p of DEMO_PRODUCTS) {
      const exists = await ProductModel.findOne({ sku: p.sku, user: userId });
      if (exists) {
        console.log("  Skip (exists):", p.name);
        createdProducts.push(exists);
        continue;
      }
      const { totalQuantity, ...rest } = p;
      const product = await ProductModel.create({ ...rest, user: userId });
      createdProducts.push(product);
      console.log("  Created:", p.name);
    }

    // 2. Create warehouses
    const warehouses = [];
    for (const w of DEMO_WAREHOUSES) {
      let wh = await WarehouseModel.findOne({ name: w.name, user: userId });
      if (!wh) {
        wh = await WarehouseModel.create({ ...w, user: userId });
        console.log("  Created warehouse:", w.name);
      }
      warehouses.push(wh);
    }

    // 3. Create storage locations and assign stock
    const storageLocations = [];
    for (const wh of warehouses) {
      for (let r = 1; r <= 2; r++) {
        for (let b = 1; b <= 3; b++) {
          let loc = await StorageLocationModel.findOne({
            warehouse: wh._id,
            rack: `R${r}`,
            bin: `B${b}`,
            user: userId,
          });
          if (!loc) {
            loc = await StorageLocationModel.create({
              warehouse: wh._id,
              rack: `R${r}`,
              bin: `B${b}`,
              zone: "General",
              user: userId,
            });
          }
          storageLocations.push(loc);
        }
      }
    }

    // 4. Assign products to storage locations
    for (let i = 0; i < createdProducts.length; i++) {
      const p = createdProducts[i];
      const targetQty = DEMO_PRODUCTS[i]?.totalQuantity ?? 0;
      if (targetQty <= 0) continue;
      const loc = storageLocations[i % storageLocations.length];
      let sl = await StockLocationModel.findOne({ product: p._id, location: loc._id });
      if (!sl) {
        await StockLocationModel.create({ product: p._id, location: loc._id, quantity: targetQty, user: userId });
      } else {
        await StockLocationModel.findByIdAndUpdate(sl._id, { $set: { quantity: sl.quantity + targetQty } });
      }
    }

    // 5. Sync total quantity from stock locations
    for (const p of createdProducts) {
      await ProductService.syncTotalQuantity(p._id);
    }

    console.log("\nSeed completed successfully!");
    console.log("  Products:", createdProducts.length);
    console.log("  Warehouses:", warehouses.length);
    console.log("  Storage locations:", storageLocations.length);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
