// models/Withdrawal.js
const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    promoter: {  // Renamed from 'agent'
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    bankDetails: {
        bankName: { type: String, required: true },
        accountNumber: { type: String, required: true },
        accountName: { type: String, required: true }
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'processed', 'rejected'],
        default: 'pending'
    },
    processedAt: Date,
    transactionReference: String,
    adminNotes: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);