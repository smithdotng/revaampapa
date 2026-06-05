// models/Cooperative.js
const mongoose = require('mongoose');

const cooperativeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    registrationNumber: String,
    country: String,
    state: String,
    address: String,
    solicitor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HectareSolicitor'
    },
    members: [{
        name: String,
        email: String,
        phone: String,
        joinedAt: Date
    }],
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'dissolved'],
        default: 'pending'
    },
    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Cooperative', cooperativeSchema);