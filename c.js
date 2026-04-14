// seed.js - Run this once to create superadmin
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createSuperadmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/revaampap');
        
        const existingAdmin = await User.findOne({ email: 'admin@revaampap.com' });
        if (!existingAdmin) {
            const superadmin = new User({
                name: 'Super Admin',
                email: 'admin@revaampap.com',
                phone: '08000000000',
                password: 'Admin123!',
                userType: 'superadmin',
                isSuspended: false
            });
            await superadmin.save();
            console.log('✅ Superadmin created successfully!');
            console.log('Email: admin@revaampap.com');
            console.log('Password: Admin123!');
        } else {
            console.log('Superadmin already exists');
        }
        
        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

createSuperadmin();