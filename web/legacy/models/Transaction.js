// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    buyer: {
        name: String,
        email: String,
        phone: String
    },
    promoter: {  // Renamed from 'agent'
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    promoterLink: String,  // Renamed from 'agentLink'
    transactionType: {
        type: String,
        enum: ['sale', 'rent', 'lease'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    agencyFee: {
        type: Number,
        required: true
    },
    commissionSplit: {
        promoter: {  // Renamed from 'agent'
            percentage: Number,
            amount: Number
        },
        platform: {
            percentage: Number,
            amount: Number
        },
        propertyOwner: {  // NEW: property owner gets 10%
            percentage: Number,
            amount: Number
        }
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    paymentReference: String,
    transactionDate: {
        type: Date,
        default: Date.now
    },
    completedDate: Date,
    notes: String
});

module.exports = mongoose.model('Transaction', transactionSchema);