// models/Click.js
const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
    promotion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Promotion',
        required: true
    },
    promoter: {  // Renamed from 'agent'
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    ipAddress: String,
    userAgent: String,
    referrer: String,
    converted: {
        type: Boolean,
        default: false
    },
    convertedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Click', clickSchema);