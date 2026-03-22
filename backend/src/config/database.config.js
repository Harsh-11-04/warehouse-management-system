const mongoose = require("mongoose")

const createIndexSafe = async (collectionName, keys, options = {}) => {
    try {
        await mongoose.connection.db.collection(collectionName).createIndex(keys, options)
    } catch (error) {
        if (error?.code === 85 || error?.code === 86 || error?.codeName === "IndexOptionsConflict" || error?.codeName === "IndexKeySpecsConflict") {
            console.warn(
                `Skipping index creation for ${collectionName}: ${error.codeName || error.message}`
            )
            return
        }

        throw error
    }
}

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost/inventry", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferMaxEntries: 0,
            bufferCommands: false
        })

        console.log(`MongoDB Connected: ${conn.connection.host}`)

        await createIndexes()

        return conn
    } catch (error) {
        console.error("Database connection error:", error)
        process.exit(1)
    }
}

const createIndexes = async () => {
    try {
        await createIndexSafe("products", { user: 1, status: 1 })
        await createIndexSafe("products", { user: 1, sku: 1 }, { unique: true })
        await createIndexSafe("products", { user: 1, totalQuantity: 1 })
        await createIndexSafe("products", { user: 1, reorderThreshold: 1 })
        await createIndexSafe("products", { user: 1, category: 1 })

        await createIndexSafe("stocklocations", { user: 1, product: 1 })
        await createIndexSafe("stocklocations", { user: 1, location: 1 })
        await createIndexSafe("stocklocations", { product: 1, location: 1 }, { unique: true })
        await createIndexSafe("stocklocations", { user: 1, quantity: 1 })

        await createIndexSafe("stockhistories", { user: 1, createdAt: -1 })
        await createIndexSafe("stockhistories", { product: 1, createdAt: -1 })
        await createIndexSafe("stockhistories", { action: 1, createdAt: -1 })
        await createIndexSafe("stockhistories", { user: 1, action: 1, createdAt: -1 })

        await createIndexSafe("warehouses", { user: 1, isActive: 1 })

        await createIndexSafe("storagelocations", { user: 1, warehouse: 1 })
        await createIndexSafe("storagelocations", { warehouse: 1, isActive: 1 })

        await createIndexSafe("reordersuggestions", { user: 1, status: 1 })
        await createIndexSafe("reordersuggestions", { product: 1, status: 1 })

        await createIndexSafe("draftpurchaseorders", { user: 1, status: 1 })
        await createIndexSafe("draftpurchaseorders", { reorderSuggestion: 1 })

        await createIndexSafe("activitylogs", { user: 1, createdAt: -1 })
        await createIndexSafe("activitylogs", { entityType: 1, createdAt: -1 })

        await createIndexSafe("users", { shopId: 1 })
        await createIndexSafe("users", { shopId: 1, role: 1 })

        await createIndexSafe("billinginvoices", { user: 1, createdAt: -1 })
        await createIndexSafe("billinginvoices", { user: 1, invoiceNumber: 1 }, { unique: true })
        await createIndexSafe("billinginvoices", { user: 1, syncState: 1, createdAt: -1 })
        await createIndexSafe(
            "billingproducts",
            { user: 1, cloudSourceId: 1 },
            {
                unique: true,
                partialFilterExpression: {
                    cloudSourceId: { $type: "string" }
                }
            }
        )

        await createIndexSafe("syncoutboxes", { eventId: 1 }, { unique: true })
        await createIndexSafe("syncoutboxes", { user: 1, status: 1, nextRetryAt: 1 })
        await createIndexSafe("syncoutboxes", { status: 1, nextRetryAt: 1, createdAt: 1 })
        await createIndexSafe("syncoutboxes", { status: 1, lockedAt: 1, createdAt: 1 })
        await createIndexSafe("syncoutboxes", { user: 1, entityType: 1, createdAt: -1 })
        await createIndexSafe("syncstates", { user: 1 }, { unique: true })
        await createIndexSafe("syncstates", { workerStatus: 1, updatedAt: -1 })

        await createIndexSafe("cloudshops", { ownerUser: 1 }, { unique: true })
        await createIndexSafe("cloudshops", { shopCode: 1 }, { unique: true })
        await createIndexSafe("cloudshops", { status: 1, updatedAt: -1 })

        await createIndexSafe("cloudproducts", { shopId: 1, externalProductId: 1 }, { unique: true })
        await createIndexSafe("cloudproducts", { shopId: 1, barcode: 1 })
        await createIndexSafe("cloudproducts", { shopId: 1, active: 1, updatedAt: -1 })

        await createIndexSafe("cloudinventories", { shopId: 1, externalProductId: 1 }, { unique: true })
        await createIndexSafe("cloudinventories", { shopId: 1, onHand: 1 })
        await createIndexSafe("cloudinventories", { shopId: 1, reorderLevel: 1 })

        await createIndexSafe("cloudcustomers", { shopId: 1, externalCustomerId: 1 }, { unique: true })
        await createIndexSafe("cloudcustomers", { shopId: 1, phone: 1 })

        await createIndexSafe("cloudsales", { shopId: 1, eventId: 1 }, { unique: true })
        await createIndexSafe("cloudsales", { shopId: 1, externalBillId: 1 }, { unique: true })
        await createIndexSafe("cloudsales", { shopId: 1, sourceCreatedAt: -1 })
        await createIndexSafe("cloudsales", { shopId: 1, paymentMode: 1, sourceCreatedAt: -1 })

        await createIndexSafe("cloudinventorymovements", { shopId: 1, eventId: 1 }, { unique: true })
        await createIndexSafe("cloudinventorymovements", { shopId: 1, externalProductId: 1, sourceCreatedAt: -1 })
        await createIndexSafe("cloudinventorymovements", { shopId: 1, movementType: 1, sourceCreatedAt: -1 })

        await createIndexSafe("cloudsyncaudits", { shopId: 1, eventId: 1 }, { unique: true })
        await createIndexSafe("cloudsyncaudits", { shopId: 1, status: 1, updatedAt: -1 })
        await createIndexSafe("cloudsyncaudits", { shopId: 1, entityType: 1, receivedAt: -1 })

        console.log("Database indexes created successfully")
    } catch (error) {
        console.error("Error creating indexes:", error)
    }
}

module.exports = { connectDB, createIndexes }
