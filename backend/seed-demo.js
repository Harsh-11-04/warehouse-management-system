const mongoose = require('mongoose');
const { UserModel, ProductModel, WarehouseModel, StorageLocationModel, StockLocationModel, ConsumerModel, OrdersModel, ShipmentModel, ActivityLogModel, StockHistoryModel } = require('./src/models');

const seedDemoData = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/inventry');
        console.log('Connected to DB\n');

        // ── Find admin & manager ──
        const admin = await UserModel.findOne({ email: 'admin@wms.com' });
        const manager = await UserModel.findOne({ email: 'manager@wms.com' });
        if (!admin || !manager) {
            console.error('❌ Admin/Manager not found. Run "node create-admin.js" first.');
            process.exit(1);
        }
        console.log('✅ Found admin & manager accounts');

        // ── Clean existing data (except users) ──
        await Promise.all([
            ProductModel.deleteMany({}),
            WarehouseModel.deleteMany({}),
            StorageLocationModel.deleteMany({}),
            StockLocationModel.deleteMany({}),
            StockHistoryModel.deleteMany({}),
            ConsumerModel.deleteMany({}),
            OrdersModel.deleteMany({}),
            ShipmentModel.deleteMany({}),
            ActivityLogModel.deleteMany({})
        ]);
        console.log('🗑️  Cleared all existing data\n');

        // ═══════════════════════════════════════════
        //  1.  PRODUCTS  (10 items)
        // ═══════════════════════════════════════════
        const productsData = [
            { user: admin._id, name: 'Wireless Bluetooth Headphones', sku: 'WBH-001', category: 'Electronics', price: 2499, totalQuantity: 150, reorderThreshold: 20 },
            { user: admin._id, name: 'USB-C Charging Cable (1m)', sku: 'UCC-002', category: 'Electronics', price: 299, totalQuantity: 500, reorderThreshold: 50 },
            { user: admin._id, name: 'Ergonomic Office Chair', sku: 'EOC-003', category: 'Furniture', price: 12999, totalQuantity: 25, reorderThreshold: 5 },
            { user: admin._id, name: 'Standing Desk (120cm)', sku: 'STD-004', category: 'Furniture', price: 18999, totalQuantity: 15, reorderThreshold: 3 },
            { user: admin._id, name: 'A4 Copy Paper (500 sheets)', sku: 'ACP-005', category: 'Stationery', price: 349, totalQuantity: 800, reorderThreshold: 100 },
            { user: admin._id, name: 'Ballpoint Pen Pack (10)', sku: 'BPP-006', category: 'Stationery', price: 149, totalQuantity: 300, reorderThreshold: 40 },
            { user: admin._id, name: 'Industrial Safety Gloves', sku: 'ISG-007', category: 'Safety', price: 599, totalQuantity: 200, reorderThreshold: 30 },
            { user: admin._id, name: 'LED Desk Lamp', sku: 'LDL-008', category: 'Electronics', price: 1499, totalQuantity: 60, reorderThreshold: 10 },
            { user: admin._id, name: 'Laptop Backpack', sku: 'LBP-009', category: 'Accessories', price: 1999, totalQuantity: 45, reorderThreshold: 8 },
            { user: admin._id, name: 'Whiteboard Marker Set (4)', sku: 'WBM-010', category: 'Stationery', price: 199, totalQuantity: 250, reorderThreshold: 30 },
        ];
        const products = await ProductModel.insertMany(productsData);
        console.log(`✅ Created ${products.length} products`);

        // ═══════════════════════════════════════════
        //  2.  WAREHOUSES  (3 locations)
        // ═══════════════════════════════════════════
        const warehousesData = [
            { user: admin._id, name: 'Mumbai Central Warehouse', address: 'Plot 45, MIDC Industrial Area, Andheri East, Mumbai 400093' },
            { user: admin._id, name: 'Delhi Distribution Center', address: '12/A, Okhla Industrial Estate, Phase-2, New Delhi 110020' },
            { user: admin._id, name: 'Bangalore Tech Hub', address: 'Survey No 15, Electronic City, Phase 1, Bangalore 560100' },
        ];
        const warehouses = await WarehouseModel.insertMany(warehousesData);
        console.log(`✅ Created ${warehouses.length} warehouses`);

        // ═══════════════════════════════════════════
        //  3.  STORAGE LOCATIONS  (4 per warehouse = 12)
        // ═══════════════════════════════════════════
        const locationsData = [];
        const zones = ['Zone-A', 'Zone-B', 'Zone-C'];
        const racks = ['R1', 'R2', 'R3', 'R4'];
        const bins = ['B1', 'B2', 'B3'];

        for (let w = 0; w < warehouses.length; w++) {
            for (let r = 0; r < 4; r++) {
                locationsData.push({
                    warehouse: warehouses[w]._id,
                    user: admin._id,
                    rack: racks[r],
                    bin: bins[r % 3],
                    zone: zones[w % 3],
                    capacity: 100 + (r * 50),
                    isActive: true
                });
            }
        }
        const locations = await StorageLocationModel.insertMany(locationsData);
        console.log(`✅ Created ${locations.length} storage locations`);

        // ═══════════════════════════════════════════
        //  4.  STOCK ASSIGNMENTS  (assign products to locations)
        // ═══════════════════════════════════════════
        const stockData = [];
        for (let i = 0; i < products.length; i++) {
            const loc = locations[i % locations.length];
            stockData.push({
                product: products[i]._id,
                location: loc._id,
                quantity: Math.floor(products[i].totalQuantity * 0.6),
                user: admin._id
            });
        }
        const stocks = await StockLocationModel.insertMany(stockData);
        console.log(`✅ Created ${stocks.length} stock assignments`);

        // ═══════════════════════════════════════════
        //  5.  STOCK HISTORY  (movement records)
        // ═══════════════════════════════════════════
        const historyData = [];
        const actions = ['Receive', 'Pick', 'Transfer', 'Assign'];
        const now = new Date();

        for (let i = 0; i < products.length; i++) {
            const loc = locations[i % locations.length];
            // Initial receive
            historyData.push({
                product: products[i]._id,
                toLocation: loc._id,
                quantity: products[i].totalQuantity,
                action: 'Receive',
                user: admin._id,
                reference: `PO-${1000 + i}`,
                createdAt: new Date(now - (10 - i) * 86400000)
            });
            // Some picks
            if (i < 6) {
                historyData.push({
                    product: products[i]._id,
                    fromLocation: loc._id,
                    quantity: Math.floor(products[i].totalQuantity * 0.1),
                    action: 'Pick',
                    user: manager._id,
                    reference: `PICK-${2000 + i}`,
                    createdAt: new Date(now - (5 - i) * 86400000)
                });
            }
        }
        const histories = await StockHistoryModel.insertMany(historyData);
        console.log(`✅ Created ${histories.length} stock history records`);

        // ═══════════════════════════════════════════
        //  6.  CONSUMERS / USERS  (8 customers)
        // ═══════════════════════════════════════════
        const consumersData = [
            { user: admin._id, name: 'Rahul Verma', email: 'rahul.verma@gmail.com', mobile: '9876543210', dob: new Date('1995-03-15'), address: '42-B, Sector 18, Noida, UP 201301' },
            { user: admin._id, name: 'Priya Sharma', email: 'priya.sharma@gmail.com', mobile: '9876543211', dob: new Date('1992-07-22'), address: 'Flat 301, Green Valley Apts, Pune 411001' },
            { user: admin._id, name: 'Amit Patel', email: 'amit.patel@yahoo.com', mobile: '9876543212', dob: new Date('1988-11-08'), address: '15, MG Road, Ahmedabad, Gujarat 380001' },
            { user: admin._id, name: 'Sneha Reddy', email: 'sneha.r@outlook.com', mobile: '9876543213', dob: new Date('1997-01-30'), address: 'H.No 8-2-120, Banjara Hills, Hyderabad 500034' },
            { user: admin._id, name: 'Vikram Singh', email: 'vikram.singh@gmail.com', mobile: '9876543214', dob: new Date('1990-06-12'), address: 'C-54, Vaishali Nagar, Jaipur 302021' },
            { user: admin._id, name: 'Ananya Iyer', email: 'ananya.iyer@gmail.com', mobile: '9876543215', dob: new Date('1994-09-25'), address: '23, Anna Nagar, Chennai 600040' },
            { user: admin._id, name: 'Rohan Das', email: 'rohan.das@gmail.com', mobile: '9876543216', dob: new Date('1993-12-05'), address: 'Plot 7, Salt Lake, Kolkata 700091' },
            { user: admin._id, name: 'Kavya Menon', email: 'kavya.menon@gmail.com', mobile: '9876543217', dob: new Date('1996-04-18'), address: '12, MG Road, Kochi, Kerala 682011' },
        ];
        const consumers = await ConsumerModel.insertMany(consumersData);
        console.log(`✅ Created ${consumers.length} consumers`);

        // ═══════════════════════════════════════════
        //  7.  ORDERS  (12 orders)
        // ═══════════════════════════════════════════
        const ordersData = [];
        for (let i = 0; i < 12; i++) {
            const consumer = consumers[i % consumers.length];
            const p1 = products[i % products.length];
            const p2 = products[(i + 3) % products.length];
            ordersData.push({
                user: admin._id,
                consumer: consumer._id,
                items: [
                    { name: p1.name, price: p1.price },
                    { name: p2.name, price: p2.price }
                ],
                isActive: i < 10,
                createdAt: new Date(now - (12 - i) * 86400000)
            });
        }
        const orders = await OrdersModel.insertMany(ordersData);
        console.log(`✅ Created ${orders.length} orders`);

        // ═══════════════════════════════════════════
        //  8.  SHIPMENTS  (8 shipments)
        // ═══════════════════════════════════════════
        const shipmentStatuses = ['Pending', 'In Transit', 'Delivered'];
        const shipmentTypes = ['Inbound', 'Outbound'];
        const shipmentsData = [];
        for (let i = 0; i < 8; i++) {
            shipmentsData.push({
                user: admin._id,
                type: shipmentTypes[i % 2],
                product: products[i % products.length]._id,
                quantity: 10 + (i * 5),
                status: shipmentStatuses[i % 4],
                handledBy: i % 2 === 0 ? admin._id : manager._id,
                notes: `Demo shipment #${i + 1} - ${shipmentTypes[i % 2]} for ${products[i % products.length].name}`,
                createdAt: new Date(now - (8 - i) * 86400000)
            });
        }
        const shipments = await ShipmentModel.insertMany(shipmentsData);
        console.log(`✅ Created ${shipments.length} shipments`);

        // ═══════════════════════════════════════════
        //  9.  ACTIVITY LOGS  (15 entries)
        // ═══════════════════════════════════════════
        const logActions = [
            { action: 'Created product', entity: 'Product', details: 'Added Wireless Bluetooth Headphones to inventory' },
            { action: 'Created product', entity: 'Product', details: 'Added USB-C Charging Cable to inventory' },
            { action: 'Created warehouse', entity: 'Warehouse', details: 'Set up Mumbai Central Warehouse' },
            { action: 'Created warehouse', entity: 'Warehouse', details: 'Set up Delhi Distribution Center' },
            { action: 'Created warehouse', entity: 'Warehouse', details: 'Set up Bangalore Tech Hub' },
            { action: 'Created location', entity: 'StorageLocation', details: 'Added rack R1-B1 in Zone-A' },
            { action: 'Created location', entity: 'StorageLocation', details: 'Added rack R2-B2 in Zone-B' },
            { action: 'Assigned stock', entity: 'StockLocation', details: 'Assigned 90 Headphones to location R1-B1' },
            { action: 'Assigned stock', entity: 'StockLocation', details: 'Assigned 300 Cables to location R2-B2' },
            { action: 'Picked stock', entity: 'StockLocation', details: 'Picked 15 Headphones from R1-B1' },
            { action: 'Created shipment', entity: 'Shipment', details: 'Inbound shipment of 10 Headphones' },
            { action: 'Updated shipment status', entity: 'Shipment', details: 'Shipment #2 marked as In Transit' },
            { action: 'Updated shipment status', entity: 'Shipment', details: 'Shipment #3 marked as Delivered' },
            { action: 'Created user', entity: 'User', details: 'Registered new consumer Rahul Verma' },
            { action: 'Created user', entity: 'User', details: 'Registered new consumer Priya Sharma' },
        ];

        const activityData = logActions.map((log, i) => ({
            user: admin._id,
            action: log.action,
            entity: log.entity,
            entityId: i < 2 ? products[i]._id :
                i < 5 ? warehouses[i - 2]._id :
                    i < 7 ? locations[i - 5]._id :
                        i < 10 ? stocks[i - 7]?._id || admin._id :
                            i < 13 ? shipments[i - 10]?._id || admin._id :
                                consumers[i - 13]._id,
            details: log.details,
            performedBy: i % 3 === 0 ? manager._id : admin._id,
            createdAt: new Date(now - (15 - i) * 3600000)
        }));
        const logs = await ActivityLogModel.insertMany(activityData);
        console.log(`✅ Created ${logs.length} activity logs`);

        // ── Summary ──
        console.log('\n' + '═'.repeat(50));
        console.log('🎉  DEMO DATA SEEDED SUCCESSFULLY!');
        console.log('═'.repeat(50));
        console.log(`   📦 Products:          ${products.length}`);
        console.log(`   🏭 Warehouses:        ${warehouses.length}`);
        console.log(`   📍 Storage Locations: ${locations.length}`);
        console.log(`   📊 Stock Assignments: ${stocks.length}`);
        console.log(`   📜 Stock History:     ${histories.length}`);
        console.log(`   👥 Consumers:         ${consumers.length}`);
        console.log(`   🛒 Orders:            ${orders.length}`);
        console.log(`   🚚 Shipments:         ${shipments.length}`);
        console.log(`   📝 Activity Logs:     ${logs.length}`);
        console.log('═'.repeat(50));
        console.log('\nLogin as admin@wms.com / admin123 to see all data!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error.message);
        process.exit(1);
    }
};

seedDemoData();
