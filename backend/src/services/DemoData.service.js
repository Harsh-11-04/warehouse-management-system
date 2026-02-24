const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const {
    UserModel,
    ProductModel,
    WarehouseModel,
    StorageLocationModel,
    StockLocationModel,
    StockHistoryModel,
    ActivityLogModel,
    ShipmentModel,
    ConsumerModel
} = require("../models")
const bcrypt = require("bcryptjs")

class DemoDataService {
    static async createDemoData() {
        try {
            console.log("🚀 Creating demo data for warehouse management system...")

            // 1. Create multiple users with different roles
            const users = await this.createDemoUsers()

            // 2. Create warehouses
            const warehouses = await this.createDemoWarehouses(users)

            // 3. Create storage locations
            const storageLocations = await this.createDemoStorageLocations(warehouses, users)

            // 4. Create products
            const products = await this.createDemoProducts(users)

            // 5. Create stock assignments
            const stockLocations = await this.createDemoStockLocations(products, storageLocations, users)

            // 6. Create shipments
            await this.createDemoShipments(products, warehouses, users)

            // 7. Create consumers
            const consumers = await this.createDemoConsumers(users)

            // 8. Create demo orders
            await this.createDemoOrders(users, products, consumers)

            // 9. Create activity logs
            await this.createDemoActivityLogs(users, products)

            console.log("✅ Demo data created successfully!")

            return {
                message: "Demo data created successfully",
                summary: {
                    users: users.length,
                    warehouses: warehouses.length,
                    storageLocations: storageLocations.length,
                    products: products.length,
                    stockLocations: stockLocations.length,
                    orders: "Created with demo order service"
                }
            }

        } catch (error) {
            console.error("❌ Error creating demo data:", error)
            throw error
        }
    }

    static async createDemoUsers() {
        // Use existing accounts created by create-admin.js
        const admin = await UserModel.findOne({ role: 'admin' })
        const manager = await UserModel.findOne({ role: 'manager' })

        if (!admin) {
            throw new Error('No admin user found. Run "node create-admin.js" first.')
        }

        const users = [admin]
        if (manager) users.push(manager)

        console.log(`👤 Using existing accounts: ${users.map(u => u.name).join(', ')}`)
        return users
    }

    static async createDemoWarehouses(users) {
        const adminUser = users.find(u => u.role === 'admin')

        const demoWarehouses = [
            {
                name: "Main Distribution Center",
                address: "123 Industrial Blvd, New York, NY 10001",
                user: adminUser._id
            },
            {
                name: "West Coast Warehouse",
                address: "456 Pacific Ave, Los Angeles, CA 90001",
                user: adminUser._id
            },
            {
                name: "Midwest Storage Facility",
                address: "789 Central St, Chicago, IL 60601",
                user: adminUser._id
            }
        ]

        const createdWarehouses = []

        for (const warehouseData of demoWarehouses) {
            const existingWarehouse = await WarehouseModel.findOne({ name: warehouseData.name })
            if (!existingWarehouse) {
                const warehouse = await WarehouseModel.create(warehouseData)
                createdWarehouses.push(warehouse)
                console.log(`🏭 Created warehouse: ${warehouseData.name}`)
            } else {
                createdWarehouses.push(existingWarehouse)
                console.log(`🏭 Warehouse already exists: ${warehouseData.name}`)
            }
        }

        return createdWarehouses
    }

    static async createDemoStorageLocations(warehouses, users) {
        const createdLocations = []

        for (const warehouse of warehouses) {
            const locations = [
                {
                    name: `Zone A - ${warehouse.name}`,
                    warehouse: warehouse._id,
                    rack: `A${warehouses.indexOf(warehouse) + 1}`,
                    bin: `A${warehouses.indexOf(warehouse) + 1}-01`,
                    zone: "Zone A",
                    capacity: 1000,
                    user: users[0]._id
                },
                {
                    name: `Zone B - ${warehouse.name}`,
                    warehouse: warehouse._id,
                    rack: `B${warehouses.indexOf(warehouse) + 1}`,
                    bin: `B${warehouses.indexOf(warehouse) + 1}-01`,
                    zone: "Zone B",
                    capacity: 1000,
                    user: users[0]._id
                },
                {
                    name: `Zone C - ${warehouse.name}`,
                    warehouse: warehouse._id,
                    rack: `C${warehouses.indexOf(warehouse) + 1}`,
                    bin: `C${warehouses.indexOf(warehouse) + 1}-01`,
                    zone: "Zone C",
                    capacity: 1000,
                    user: users[0]._id
                }
            ]

            for (const locationData of locations) {
                const existingLocation = await StorageLocationModel.findOne({
                    warehouse: locationData.warehouse,
                    rack: locationData.rack,
                    bin: locationData.bin
                })
                if (!existingLocation) {
                    const location = await StorageLocationModel.create(locationData)
                    createdLocations.push(location)
                    console.log(`📍 Created storage location: ${locationData.name}`)
                } else {
                    createdLocations.push(existingLocation)
                    console.log(`📍 Storage location already exists: ${locationData.name}`)
                }
            }
        }

        return createdLocations
    }

    static async createDemoProducts(users) {
        const adminUser = users.find(u => u.role === 'admin')

        const demoProducts = [
            {
                name: "Laptop Computer",
                sku: "LAP-001",
                category: "Electronics",
                price: 899.99,
                totalQuantity: 150,
                reorderThreshold: 20,
                user: adminUser._id
            },
            {
                name: "Office Chair",
                sku: "CHR-001",
                category: "Furniture",
                price: 249.99,
                totalQuantity: 75,
                reorderThreshold: 15,
                user: adminUser._id
            },
            {
                name: "Wireless Mouse",
                sku: "MOU-001",
                category: "Electronics",
                price: 29.99,
                totalQuantity: 200,
                reorderThreshold: 50,
                user: adminUser._id
            },
            {
                name: "Desk Lamp",
                sku: "LAM-001",
                category: "Lighting",
                price: 45.99,
                totalQuantity: 100,
                reorderThreshold: 25,
                user: adminUser._id
            },
            {
                name: "USB Cable",
                sku: "USB-001",
                category: "Electronics",
                price: 12.99,
                totalQuantity: 500,
                reorderThreshold: 100,
                user: adminUser._id
            },
            {
                name: "Notebook Set",
                sku: "NBK-001",
                category: "Stationery",
                price: 15.99,
                totalQuantity: 300,
                reorderThreshold: 75,
                user: adminUser._id
            },
            {
                name: "Monitor Stand",
                sku: "MON-001",
                category: "Furniture",
                price: 89.99,
                totalQuantity: 60,
                reorderThreshold: 10,
                user: adminUser._id
            },
            {
                name: "Keyboard",
                sku: "KEY-001",
                category: "Electronics",
                price: 79.99,
                totalQuantity: 120,
                reorderThreshold: 30,
                user: adminUser._id
            }
        ]

        const createdProducts = []

        for (const productData of demoProducts) {
            const existingProduct = await ProductModel.findOne({ sku: productData.sku })
            if (!existingProduct) {
                const product = await ProductModel.create(productData)
                createdProducts.push(product)
                console.log(`📦 Created product: ${productData.name} (${productData.sku})`)
            } else {
                createdProducts.push(existingProduct)
                console.log(`📦 Product already exists: ${productData.name}`)
            }
        }

        return createdProducts
    }

    static async createDemoStockLocations(products, storageLocations, users) {
        const staffUsers = users
        const createdStockLocations = []

        for (let i = 0; i < products.length; i++) {
            const product = products[i]
            const location = storageLocations[i % storageLocations.length]
            const staffUser = staffUsers[i % staffUsers.length] || users[0]

            const existingStockLocation = await StockLocationModel.findOne({
                product: product._id,
                location: location._id
            })

            if (!existingStockLocation) {
                const quantity = Math.floor(Math.random() * 50) + 10 // Random quantity between 10-60

                const stockLocation = await StockLocationModel.create({
                    product: product._id,
                    location: location._id,
                    quantity: quantity,
                    user: staffUser._id
                })

                createdStockLocations.push(stockLocation)
                console.log(`📊 Created stock location: ${product.name} at ${location.name} (${quantity} units)`)

                // Create stock history entry
                await StockHistoryModel.create({
                    product: product._id,
                    toLocation: location._id,
                    quantity: quantity,
                    action: "Receive",
                    user: staffUser._id,
                    reference: "Initial Stock Setup",
                    metadata: { demoData: true }
                })
            } else {
                createdStockLocations.push(existingStockLocation)
            }
        }

        return createdStockLocations
    }

    static async createDemoShipments(products, warehouses, users) {
        let managerUsers = users.filter(u => u.role === 'manager')
        if (managerUsers.length === 0) managerUsers = [users[0]]

        const demoShipments = [
            {
                type: "Inbound",
                status: "In Transit",
                product: products[0]._id,
                quantity: 25,
                handledBy: managerUsers[0]._id,
                notes: "Demo inbound shipment from supplier",
                user: managerUsers[0]._id
            },
            {
                type: "Outbound",
                status: "Delivered",
                product: products[1]._id,
                quantity: 15,
                handledBy: managerUsers[1]?._id || managerUsers[0]._id,
                notes: "Demo outbound shipment to customer",
                user: managerUsers[1]?._id || managerUsers[0]._id
            },
            {
                type: "Inbound",
                status: "Pending",
                product: products[2]._id,
                quantity: 100,
                handledBy: managerUsers[0]._id,
                notes: "Demo pending inbound shipment",
                user: managerUsers[0]._id
            }
        ]

        for (const shipmentData of demoShipments) {
            const existingShipment = await ShipmentModel.findOne({
                product: shipmentData.product,
                type: shipmentData.type
            })
            if (!existingShipment) {
                const shipment = await ShipmentModel.create(shipmentData)
                console.log(`🚚 Created shipment: ${shipmentData.type} (${shipmentData.status})`)
            }
        }
    }

    static async createDemoConsumers(users) {
        let managerUsers = users.filter(u => u.role === 'manager')
        if (managerUsers.length === 0) managerUsers = [users[0]]

        const demoConsumers = [
            {
                name: "Tech Solutions Inc.",
                email: "orders@techsolutions.com",
                mobile: "+1-555-0101",
                dob: new Date("1990-01-15"),
                address: "123 Tech Street, Silicon Valley, CA 94000",
                user: managerUsers[0]._id
            },
            {
                name: "Global Office Supplies",
                email: "purchasing@globaloffice.com",
                mobile: "+1-555-0102",
                dob: new Date("1985-05-22"),
                address: "456 Business Ave, New York, NY 10001",
                user: managerUsers[1]?._id || managerUsers[0]._id
            },
            {
                name: "Retail Chain Co.",
                email: "procurement@retailchain.com",
                mobile: "+1-555-0103",
                dob: new Date("1992-11-08"),
                address: "789 Commerce Blvd, Chicago, IL 60601",
                user: managerUsers[0]._id
            }
        ]

        for (const consumerData of demoConsumers) {
            const existingConsumer = await ConsumerModel.findOne({ email: consumerData.email })
            if (!existingConsumer) {
                const consumer = await ConsumerModel.create(consumerData)
                console.log(`🏢 Created consumer: ${consumerData.name}`)
            }
        }
    }

    static async createDemoActivityLogs(users, products) {
        const demoActivities = [
            {
                action: "Product Created",
                description: "New product added to inventory",
                user: users[0]._id,
                metadata: { productId: products[0]._id, productName: products[0].name }
            },
            {
                action: "Stock Received",
                description: "Inventory received at warehouse",
                user: users[0]._id,
                metadata: { productId: products[1]._id, quantity: 25 }
            },
            {
                action: "Shipment Created",
                description: "New shipment scheduled",
                user: users[1]?._id || users[0]._id,
                metadata: { shipmentNumber: "SHP-2024-001" }
            },
            {
                action: "Low Stock Alert",
                description: "Product below reorder threshold",
                user: users[0]._id,
                metadata: { productId: products[2]._id, currentStock: 45, threshold: 50 }
            },
            {
                action: "User Login",
                description: "User authenticated to system",
                user: users[0]._id,
                metadata: { loginTime: new Date() }
            }
        ]

        for (const activityData of demoActivities) {
            const activity = await ActivityLogModel.create(activityData)
            console.log(`📝 Created activity log: ${activityData.action}`)
        }
    }

    static async createDemoOrders(users, products, consumers) {
        const DemoOrderService = require("./DemoOrder.service")
        return await DemoOrderService.createDemoOrders(users, products, consumers)
    }
}

module.exports = DemoDataService
