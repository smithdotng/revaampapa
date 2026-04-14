// models/Promotion.js
const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
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
    referralCode: {
        type: String,
        required: true,
        unique: true
    },
    referralLink: {
        type: String,
        required: true
    },
    clicks: {
        type: Number,
        default: 0
    },
    inquiries: {
        type: Number,
        default: 0
    },
    transactions: {
        type: Number,
        default: 0
    },
    earnings: {
        type: Number,
        default: 0
    },
    qrCode: {
        type: String,
        default: null
    },
    socialShares: {
        facebook: { type: Number, default: 0 },
        twitter: { type: Number, default: 0 },
        instagram: { type: Number, default: 0 },
        whatsapp: { type: Number, default: 0 },
        linkedin: { type: Number, default: 0 }
    },
    lastClickedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Generate unique referral code
promotionSchema.methods.generateReferralCode = function() {
    const prefix = 'RVMP'; // Revaamp
    const promoterCode = this.promoter.toString().slice(-6).toUpperCase();
    const propertyCode = this.property.toString().slice(-6).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.referralCode = `${prefix}-${promoterCode}-${propertyCode}-${random}`;
    return this.referralCode;
};

// Generate full referral link
promotionSchema.methods.generateReferralLink = function(baseUrl) {
    this.referralLink = `${baseUrl}/r/${this.referralCode}`;
    return this.referralLink;
};

// Ensure one promoter can only promote a property once
promotionSchema.index({ promoter: 1, property: 1 }, { unique: true });

module.exports = mongoose.model('Promotion', promotionSchema);