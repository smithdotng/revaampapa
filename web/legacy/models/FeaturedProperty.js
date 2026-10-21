// models/FeaturedProperty.js
const mongoose = require('mongoose');

const featuredPropertySchema = new mongoose.Schema({
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    image: String,
    badge: {
        text: String,
        color: String
    },
    arrangementType: {
        type: String,
        enum: ['special_deal', 'promotion', 'partnership'],
        required: true
    },
    partnerDetails: {
        name: String,
        contact: String
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: Date,
    isActive: {
        type: Boolean,
        default: true
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('FeaturedProperty', featuredPropertySchema);