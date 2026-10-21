const mongoose = require('mongoose');

const referralClickSchema = new mongoose.Schema({
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referralCode: {
        type: String,
        required: true
    },
    referralType: {
        type: String,
        enum: ['promoter', 'business_partner', 'sub_aggregator', 'voucher_subscriber'],
        default: 'promoter'
    },
    ipAddress: String,
    userAgent: String,
    referrerUrl: String,
    clickedAt: {
        type: Date,
        default: Date.now
    },
    converted: {
        type: Boolean,
        default: false
    },
    convertedAt: Date,
    registeredUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Index for faster queries
referralClickSchema.index({ referrer: 1, clickedAt: -1 });
referralClickSchema.index({ referralCode: 1 });

module.exports = mongoose.model('ReferralClick', referralClickSchema);