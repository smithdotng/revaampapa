const mongoose = require('mongoose');

const clickTrackingSchema = new mongoose.Schema({
    promoter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property'
    },
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel'
    },
    type: {
        type: String,
        enum: ['property', 'hotel', 'referral'],
        default: 'property'
    },
    referralLink: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    referrer: {
        type: String
    },
    converted: {
        type: Boolean,
        default: false
    },
    conversionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    },
    clickedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
clickTrackingSchema.index({ promoter: 1, createdAt: -1 });
clickTrackingSchema.index({ property: 1 });
clickTrackingSchema.index({ hotel: 1 });

module.exports = mongoose.model('ClickTracking', clickTrackingSchema);