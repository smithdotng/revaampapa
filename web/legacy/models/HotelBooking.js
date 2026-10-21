const mongoose = require('mongoose');

const hotelBookingSchema = new mongoose.Schema({
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: true
    },
    roomType: {
        type: String,
        required: true
    },
    guestName: {
        type: String,
        required: true
    },
    guestEmail: {
        type: String,
        required: true
    },
    guestPhone: {
        type: String,
        required: true
    },
    checkInDate: {
        type: Date,
        required: true
    },
    checkOutDate: {
        type: Date,
        required: true
    },
    numberOfGuests: {
        type: Number,
        required: true,
        min: 1
    },
    totalAmount: {
        type: Number,
        required: true
    },
    commissionAmount: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    bookingStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    promoter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    businessPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    uniqueLinkCode: {
        type: String,
        required: true
    },
    clickId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HotelClick'
    },
    bookingReference: {
        type: String,
        unique: true
    },
    specialRequests: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Generate unique booking reference
hotelBookingSchema.pre('save', function(next) {
    if (!this.bookingReference) {
        this.bookingReference = 'HBK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('HotelBooking', hotelBookingSchema);