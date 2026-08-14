// models/PartnerHotel.js
// Revaamp Partner Hotel — a hotel that partners with Revaamp to be listed,
// marketed and promoted to the Revaamp network across Africa.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const partnerHotelSchema = new mongoose.Schema({
    // ============= ACCOUNT =============
    // `name` is the contact person's name (kept as `name` so it works with the
    // shared login / session / suspension logic used by the other partner models)
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        enum: ['partner_hotel'],
        default: 'partner_hotel'
    },
    position: {
        // Role of the contact person at the hotel (GM, Owner, Sales Manager...)
        type: String,
        default: ''
    },

    // ============= HOTEL INFORMATION =============
    hotelName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    starRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    numberOfRooms: {
        type: Number,
        default: 0
    },
    yearEstablished: Number,
    website: String,

    location: {
        address: String,
        city: String,
        state: String,
        country: {
            type: String,
            default: 'Nigeria'
        },
        coordinates: {
            lat: Number,
            lng: Number
        }
    },

    roomTypes: [{
        name: String,
        price: Number,
        totalRooms: Number,
        description: String
    }],

    amenities: [{
        type: String,
        enum: ['wifi', 'pool', 'gym', 'restaurant', 'parking', 'spa', 'conference', 'airport_shuttle', 'room_service', 'bar']
    }],

    images: [{
        url: String,
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],

    // ============= VERIFICATION DOCUMENTS =============
    cacCertificate: {
        url: { type: String, default: '' },
        filename: { type: String, default: '' },
        uploadedAt: Date
    },
    hotelLicence: {
        // Tourism board / state hospitality operating licence
        url: { type: String, default: '' },
        filename: { type: String, default: '' },
        uploadedAt: Date
    },
    ratePolicy: {
        // Rate card / corporate rate agreement offered to the Revaamp network
        url: { type: String, default: '' },
        filename: { type: String, default: '' },
        uploadedAt: Date
    },

    // ============= PARTNERSHIP =============
    partnerProfile: {
        isActive: {
            type: Boolean,
            default: false
        },
        approvedAt: Date,
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rejectionReason: String,
        mandateAccepted: {
            type: Boolean,
            default: false
        },
        mandateAcceptedAt: Date,
        // The public Hotel listing created from this partner on approval
        listing: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hotel'
        },
        commissionRate: {
            type: Number,
            default: 30,
            min: 0,
            max: 100
        },
        placementTier: {
            type: String,
            enum: ['standard', 'featured'],
            default: 'standard'
        },
        // How the hotel heard about / was onboarded to Revaamp
        referredByCode: String,
        onboardedByPromoter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // ============= PRICING (fields reserved — no amounts wired yet) =============
    // Superadmin can set these later without a schema change.
    pricing: {
        listingFee: {
            type: Number,
            default: null
        },
        currency: {
            type: String,
            default: 'NGN'
        },
        billingCycle: {
            type: String,
            enum: ['none', 'one_off', 'annual'],
            default: 'none'
        },
        feeStatus: {
            type: String,
            enum: ['not_applicable', 'pending', 'confirmed', 'waived'],
            default: 'not_applicable'
        },
        paymentReference: String,
        paymentProof: String,
        paidAt: Date
    },

    // ============= ACCOUNT STATUS =============
    profileImage: {
        type: String,
        default: 'default-avatar.jpg'
    },
    isSuspended: {
        type: Boolean,
        default: false
    },
    suspensionReason: String,
    suspendedAt: Date,

    resetPasswordToken: String,
    resetPasswordExpires: Date,

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
partnerHotelSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update timestamp on save
partnerHotelSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Compare password method
partnerHotelSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('PartnerHotel', partnerHotelSchema);
