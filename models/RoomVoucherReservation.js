// models/RoomVoucherReservation.js
// A Room Voucher Subscriber registering interest in a specific hotel listing.
// This record IS the claim: no reservation registered against a hotel before the
// stay means no cashback is payable.
const mongoose = require('mongoose');

const roomVoucherReservationSchema = new mongoose.Schema({
    reference: {
        type: String,
        unique: true,
        index: true
    },
    subscriber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VoucherSubscriber',
        required: true,
        index: true
    },
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: true,
        index: true
    },
    // Snapshot so the record still reads correctly if a listing is renamed
    hotelName: String,

    // ============= GUEST =============
    guestName: {
        type: String,
        required: true
    },
    guestEmail: String,
    guestPhone: String,

    // ============= STAY =============
    roomType: String,
    checkInDate: {
        type: Date,
        required: true
    },
    checkOutDate: {
        type: Date,
        required: true
    },
    nights: {
        type: Number,
        default: 0
    },
    numberOfRooms: {
        type: Number,
        default: 1,
        min: 1
    },
    numberOfGuests: {
        type: Number,
        default: 1,
        min: 1
    },
    specialRequests: String,

    // ============= MONEY =============
    // Quoted nightly rate for one room. Everything below is derived from it.
    roomRate: {
        type: Number,
        default: 0
    },
    estimatedTotal: {
        type: Number,
        default: 0
    },
    // Snapshot of the hotel's voucher rate at the time of registering, so a
    // later change to the hotel does not move an existing claim.
    voucherDiscountRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    cashbackAmount: {
        type: Number,
        default: 0
    },

    // ============= LIFECYCLE =============
    status: {
        type: String,
        enum: ['registered', 'confirmed', 'stayed', 'cancelled', 'no_show'],
        default: 'registered'
    },
    cashbackStatus: {
        type: String,
        enum: ['pending', 'approved', 'paid', 'void'],
        default: 'pending'
    },
    confirmedAt: Date,
    stayedAt: Date,
    cancelledAt: Date,

    cashbackApprovedAt: Date,
    cashbackApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cashbackPaidAt: Date,
    cashbackPaidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cashbackPaymentReference: String,
    adminNotes: String,

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Derive nights, total and cashback from the rate every save, and stamp a
// reference on first save.
roomVoucherReservationSchema.pre('save', function(next) {
    if (!this.reference) {
        this.reference = 'RVR-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    if (this.checkInDate && this.checkOutDate) {
        const ms = new Date(this.checkOutDate) - new Date(this.checkInDate);
        this.nights = Math.max(0, Math.round(ms / 86400000));
    }

    const rate = Number(this.roomRate) || 0;
    const rooms = Number(this.numberOfRooms) || 1;
    const nights = Number(this.nights) || 0;
    this.estimatedTotal = rate * rooms * nights;

    const pct = Number(this.voucherDiscountRate) || 0;
    this.cashbackAmount = Math.round(this.estimatedTotal * pct) / 100;

    // A cancelled or no-show stay never pays cashback
    if (this.status === 'cancelled' || this.status === 'no_show') {
        if (this.cashbackStatus !== 'paid') this.cashbackStatus = 'void';
    }

    this.updatedAt = Date.now();
    next();
});

roomVoucherReservationSchema.index({ subscriber: 1, createdAt: -1 });
roomVoucherReservationSchema.index({ hotel: 1, checkInDate: 1 });
roomVoucherReservationSchema.index({ cashbackStatus: 1, status: 1 });

module.exports = mongoose.model('RoomVoucherReservation', roomVoucherReservationSchema);
