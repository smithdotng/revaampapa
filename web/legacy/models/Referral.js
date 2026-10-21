const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referred: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: ['promoter', 'business_partner', 'sub_aggregator', 'voucher_subscriber'],
        required: true
    },
    referralCode: String,
    commissionRate: Number,
    commissionAmount: Number,
    status: {
        type: String,
        enum: ['pending', 'completed', 'paid'],
        default: 'pending'
    },
    completedAt: Date,
    paidAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Referral', referralSchema);