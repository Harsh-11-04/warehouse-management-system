const mongoose = require('mongoose')

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/inventry', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferMaxEntries: 0,
            bufferCommands: false,
        })

        console.log(`MongoDB Connected: ${conn.connection.host}`)

        // Create indexes for better performance
        await createIndexes()

        return conn
    } catch (error) {
        console.error('Database connection error:', error)
        process.exit(1)
    }
}

const createIndexes = async () => {
    try {
        // Product indexes
        await mongoose.connection.db.collection('products').createIndex({ user: 1, status: 1 })
        await mongoose.connection.db.collection('products').createIndex({ user: 1, sku: 1 }, { unique: true })
        await mongoose.connection.db.collection('products').createIndex({ user: 1, totalQuantity: 1 })
        await mongoose.connection.db.collection('products').createIndex({ user: 1, reorderThreshold: 1 })
        await mongoose.connection.db.collection('products').createIndex({ user: 1, category: 1 })

        // StockLocation indexes
        await mongoose.connection.db.collection('stocklocations').createIndex({ user: 1, product: 1 })
        await mongoose.connection.db.collection('stocklocations').createIndex({ user: 1, location: 1 })
        await mongoose.connection.db.collection('stocklocations').createIndex({ product: 1, location: 1 }, { unique: true })
        await mongoose.connection.db.collection('stocklocations').createIndex({ user: 1, quantity: 1 })

        // StockHistory indexes
        await mongoose.connection.db.collection('stockhistories').createIndex({ user: 1, createdAt: -1 })
        await mongoose.connection.db.collection('stockhistories').createIndex({ product: 1, createdAt: -1 })
        await mongoose.connection.db.collection('stockhistories').createIndex({ action: 1, createdAt: -1 })
        await mongoose.connection.db.collection('stockhistories').createIndex({ user: 1, action: 1, createdAt: -1 })

        // Warehouse indexes
        await mongoose.connection.db.collection('warehouses').createIndex({ user: 1, isActive: 1 })

        // StorageLocation indexes
        await mongoose.connection.db.collection('storagelocations').createIndex({ user: 1, warehouse: 1 })
        await mongoose.connection.db.collection('storagelocations').createIndex({ warehouse: 1, isActive: 1 })

        // ReorderSuggestion indexes
        await mongoose.connection.db.collection('reordersuggestions').createIndex({ user: 1, status: 1 })
        await mongoose.connection.db.collection('reordersuggestions').createIndex({ product: 1, status: 1 })

        // DraftPurchaseOrder indexes
        await mongoose.connection.db.collection('draftpurchaseorders').createIndex({ user: 1, status: 1 })
        await mongoose.connection.db.collection('draftpurchaseorders').createIndex({ reorderSuggestion: 1 })

        // ActivityLog indexes
        await mongoose.connection.db.collection('activitylogs').createIndex({ user: 1, createdAt: -1 })
        await mongoose.connection.db.collection('activitylogs').createIndex({ entityType: 1, createdAt: -1 })

        console.log('Database indexes created successfully')
    } catch (error) {
        console.error('Error creating indexes:', error)
    }
}

module.exports = { connectDB, createIndexes }
