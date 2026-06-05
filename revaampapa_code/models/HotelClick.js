const mongoose = require('mongoose');

const hotelClickSchema = new mongoose.Schema({
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: true
    },
    promoter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    businessPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    clickerType: {
        type: String,
        enum: ['promoter', 'business_partner', 'anonymous'],
        default: 'anonymous'
    },
    uniqueLinkCode: {
        type: String,
        required: true
    },
    ipAddress: String,
    userAgent: String,
    referrer: String,
    clickedAt: {
        type: Date,
        default: Date.now
    },
    converted: {
        type: Boolean,
        default: false
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HotelBooking'
    },
    commissionEarned: {
        type: Number,
        default: 0
    }
});

// Index for faster queries
hotelClickSchema.index({ hotel: 1, uniqueLinkCode: 1 });
hotelClickSchema.index({ promoter: 1, createdAt: -1 });
hotelClickSchema.index({ businessPartner: 1, createdAt: -1 });

module.exports = mongoose.model('HotelClick', hotelClickSchema);