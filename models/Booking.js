// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    bookingReference: {
        type: String,
        required: true,
        unique: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    guest: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        numberOfGuests: {
            type: Number,
            required: true,
            min: 1
        }
    },
    dates: {
        checkIn: {
            type: Date,
            required: true
        },
        checkOut: {
            type: Date,
            required: true
        },
        nights: {
            type: Number,
            required: true
        }
    },
    pricing: {
        nightlyRate: Number,
        weekendRate: Number,
        subtotal: Number,
        cleaningFee: Number,
        securityDeposit: Number,
        discount: {
            type: Number,
            default: 0
        },
        discountType: {
            type: String,
            enum: ['weekly', 'monthly', 'early_bird', 'last_minute', 'custom']
        },
        total: {
            type: Number,
            required: true
        }
    },
    payment: {
        method: {
            type: String,
            enum: ['card', 'bank_transfer', 'cash', 'paystack'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },
        transactionReference: String,
        paidAt: Date,
        refundReference: String
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
        default: 'pending'
    },
    specialRequests: String,
    cancellation: {
        cancelledAt: Date,
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        refundAmount: Number
    },
    review: {
        rating: Number,
        comment: String,
        createdAt: Date
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Agent who referred this booking
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Generate booking reference
bookingSchema.pre('save', function(next) {
    if (!this.bookingReference) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.bookingReference = `BOK-${timestamp}-${random}`;
    }
    this.updatedAt = Date.now();
    next();
});

// Check if dates are available
bookingSchema.statics.checkAvailability = async function(propertyId, checkIn, checkOut) {
    const bookings = await this.find({
        property: propertyId,
        status: { $in: ['confirmed', 'checked_in'] },
        $or: [
            {
                'dates.checkIn': { $lt: checkOut },
                'dates.checkOut': { $gt: checkIn }
            }
        ]
    });
    
    return bookings.length === 0;
};

module.exports = mongoose.model('Booking', bookingSchema);