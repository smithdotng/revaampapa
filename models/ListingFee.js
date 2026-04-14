const mongoose = require('mongoose');

const listingFeeSchema = new mongoose.Schema({
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    tier: {
        type: String,
        enum: ['standard', 'premium'],
        required: true
    },
    feeAmount: {
        type: Number,
        required: true
    },
    feePaid: {
        type: Boolean,
        default: false
    },
    paymentReference: String,
    commissionSplit: {
        agent: Number,
        promoter: Number,
        platform: Number
    },
    features: [String],
    paidAt: Date,
    expiresAt: Date,
    upgradeHistory: [{
        fromTier: String,
        toTier: String,
        amount: Number,
        date: Date,
        reference: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ListingFee', listingFeeSchema);