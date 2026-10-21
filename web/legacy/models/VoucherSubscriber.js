// models/VoucherSubscriber.js
// Revaamp Room Voucher Subscriber — subscribes to the Room Voucher programme and
// earns cashback on stays at listed hotels, provided the stay was registered
// against a specific hotel listing before check-in.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const voucherSubscriberSchema = new mongoose.Schema({
    // ============= ACCOUNT =============
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
        enum: ['voucher_subscriber'],
        default: 'voucher_subscriber'
    },

    // Human-friendly membership number quoted when claiming a discount
    subscriberCode: {
        type: String,
        unique: true,
        index: true
    },

    location: {
        city: String,
        state: String,
        country: {
            type: String,
            default: 'Nigeria'
        }
    },

    // ============= SUBSCRIPTION =============
    subscription: {
        status: {
            type: String,
            enum: ['pending', 'active', 'expired', 'cancelled'],
            default: 'pending'
        },
        plan: {
            type: String,
            default: 'standard'
        },
        startedAt: Date,
        expiresAt: Date,
        activatedAt: Date,
        activatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        cancelledAt: Date,
        cancellationReason: String
    },

    // ============= PRICING (reserved — no amount wired yet) =============
    // Superadmin can set terms later without a schema change. The promoter /
    // business partner who introduced the subscriber earns
    // referral.commissionRate % of whatever fee is eventually charged.
    pricing: {
        fee: {
            type: Number,
            default: null
        },
        currency: {
            type: String,
            default: 'NGN'
        },
        billingCycle: {
            type: String,
            enum: ['none', 'one_off', 'monthly', 'annual'],
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

    // ============= REFERRAL CREDIT =============
    // Promoters and business partners share /voucher/register?ref=<id> links and
    // earn 50% of the subscription fee for each subscriber they onboard.
    referral: {
        referredByCode: String,
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        referrerType: {
            type: String,
            enum: ['promoter', 'business_partner', 'none'],
            default: 'none'
        },
        commissionRate: {
            type: Number,
            default: 50
        },
        commissionStatus: {
            type: String,
            enum: ['not_applicable', 'pending', 'paid'],
            default: 'not_applicable'
        },
        commissionPaidAt: Date
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
voucherSubscriberSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Generate the membership code and keep the timestamp fresh
voucherSubscriberSchema.pre('save', function(next) {
    if (!this.subscriberCode) {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.subscriberCode = 'RV-' + random;
    }
    this.updatedAt = Date.now();
    next();
});

voucherSubscriberSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// A subscription is only good for claiming cashback while it is active and
// has not run past its expiry date.
voucherSubscriberSchema.methods.hasActiveSubscription = function() {
    if (this.isSuspended) return false;
    if (!this.subscription || this.subscription.status !== 'active') return false;
    if (this.subscription.expiresAt && new Date(this.subscription.expiresAt) < new Date()) return false;
    return true;
};

module.exports = mongoose.model('VoucherSubscriber', voucherSubscriberSchema);
