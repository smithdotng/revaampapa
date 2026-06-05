const mongoose = require('mongoose');

const shareTrackingSchema = new mongoose.Schema({
    promoter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    linkType: {
        type: String,
        enum: ['referral', 'property', 'hotel', 'voucher', 'business_partner', 'aggregator'],
        default: 'referral'
    },
    platform: {
        type: String,
        enum: ['whatsapp', 'facebook', 'twitter', 'linkedin', 'instagram', 'email', 'copy', 'other'],
        required: true
    },
    link: {
        type: String,
        required: true
    },
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property'
    },
    hotelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel'
    },
    referralCode: {
        type: String
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    sharedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for faster queries
shareTrackingSchema.index({ promoter: 1, sharedAt: -1 });
shareTrackingSchema.index({ platform: 1 });
shareTrackingSchema.index({ linkType: 1 });
shareTrackingSchema.index({ sharedAt: -1 });

module.exports = mongoose.model('ShareTracking', shareTrackingSchema);