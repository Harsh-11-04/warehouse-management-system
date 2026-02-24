const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { UserModel } = require('./src/models');

const seedAccounts = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/inventry');
        console.log('Connected to DB');

        // 1. Delete all existing users
        const deleted = await UserModel.deleteMany({});
        console.log(`🗑️  Deleted ${deleted.deletedCount} existing user(s)`);

        // 2. Create admin account
        const adminPassword = await bcrypt.hash('admin123', 10);
        await UserModel.create({
            name: 'Admin',
            email: 'admin@wms.com',
            password: adminPassword,
            role: 'admin'
        });
        console.log('✅ Admin created  →  admin@wms.com / admin123');

        // 3. Create manager account
        const managerPassword = await bcrypt.hash('manager123', 10);
        await UserModel.create({
            name: 'Manager',
            email: 'manager@wms.com',
            password: managerPassword,
            role: 'manager'
        });
        console.log('✅ Manager created →  manager@wms.com / manager123');

        console.log('\n🎉 Done! New users can register via /register (they get warehouse_staff role)');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

seedAccounts();
