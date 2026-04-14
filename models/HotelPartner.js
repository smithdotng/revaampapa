const mongoose = require('mongoose');

const hotelPartnerSchema = new mongoose.Schema({
    promoter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    location: String,
    address: String,
    contact: {
        name: String,
        phone: String,
        email: String
    },
    roomTypes: [{
        name: String,
        price: Number,
        available: Boolean
    }],
    documents: [String],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'active'],
        default: 'pending'
    },
    commissionRate: {
        type: Number,
        default: 30
    },
    promoterCommission: {
        type: Number,
        default: 30
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('HotelPartner', hotelPartnerSchema);