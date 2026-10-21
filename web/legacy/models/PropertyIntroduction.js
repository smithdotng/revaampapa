const mongoose = require('mongoose');

const propertyIntroductionSchema = new mongoose.Schema({
    promoter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    propertyType: {
        type: String,
        enum: ['land', 'building', 'shortlet', 'shop', 'business_complex'],
        required: true
    },
    location: String,
    value: Number,
    description: String,
    owner: {
        name: String,
        phone: String,
        email: String
    },
    documents: [String],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'sold'],
        default: 'pending'
    },
    commissionRate: {
        type: Number,
        default: 40
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PropertyIntroduction', propertyIntroductionSchema);