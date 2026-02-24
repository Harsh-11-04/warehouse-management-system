const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const { OrdersModel, ConsumerModel, ProductModel } = require("../models")

class DemoOrderService {
    static async createDemoOrders(users, products, consumers) {
        try {
            console.log("📦 Creating demo orders...")
            
            const managerUsers = users.filter(u => u.role === 'manager')
            const demoOrders = [
                {
                    consumer: consumers[0]._id, // Tech Solutions Inc.
                    items: [
                        {
                            name: "Laptop Computer",
                            sku: "LAP-001",
                            quantity: 5,
                            price: 899.99
                        },
                        {
                            name: "Wireless Mouse",
                            sku: "MOU-001", 
                            quantity: 10,
                            price: 29.99
                        }
                    ],
                    user: managerUsers[0]._id
                },
                {
                    consumer: consumers[1]._id, // Global Office Supplies
                    items: [
                        {
                            name: "Office Chair",
                            sku: "CHR-001",
                            quantity: 3,
                            price: 249.99
                        },
                        {
                            name: "Desk Lamp",
                            sku: "LAM-001",
                            quantity: 8,
                            price: 45.99
                        }
                    ],
                    user: managerUsers[1]?._id || managerUsers[0]._id
                },
                {
                    consumer: consumers[2]._id, // Retail Chain Co.
                    items: [
                        {
                            name: "Notebook Set",
                            sku: "NBK-001",
                            quantity: 20,
                            price: 15.99
                        },
                        {
                            name: "USB Cable",
                            sku: "USB-001",
                            quantity: 50,
                            price: 12.99
                        },
                        {
                            name: "Keyboard",
                            sku: "KEY-001",
                            quantity: 15,
                            price: 79.99
                        }
                    ],
                    user: managerUsers[0]._id
                }
            ]
            
            const createdOrders = []
            
            for (const orderData of demoOrders) {
                const existingOrder = await OrdersModel.findOne({
                    user: orderData.user,
                    consumer: orderData.consumer
                })
                
                if (!existingOrder) {
                    const order = await OrdersModel.create(orderData)
                    createdOrders.push(order)
                    console.log(`📋 Created order for consumer with ${orderData.items.length} items`)
                } else {
                    createdOrders.push(existingOrder)
                    console.log(`📋 Order already exists for this consumer`)
                }
            }
            
            console.log(`✅ Created ${createdOrders.length} demo orders`)
            return createdOrders
            
        } catch (error) {
            console.error("❌ Error creating demo orders:", error)
            throw error
        }
    }
}

module.exports = DemoOrderService
