const mongoose = require('mongoose');

const buyerIntroductionSchema = new mongoose.Schema({
    promoter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    buyer: {
        name: String,
        phone: String,
        email: String
    },
    propertyInterested: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property'
    },
    budget: Number,
    locationPreference: String,
    message: String,
    status: {
        type: String,
        enum: ['pending', 'matched', 'completed', 'rejected'],
        default: 'pending'
    },
    commissionRateBuyer: {
        type: Number,
        default: 90
    },
    commissionRateSeller: {
        type: Number,
        default: 50
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BuyerIntroduction', buyerIntroductionSchema);