// models/Solicitor.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const solicitorSchema = new mongoose.Schema({
    // Basic Information
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
        enum: ['solicitor', 'hectare_solicitor', 'admin', 'superadmin'],
        default: 'solicitor'
    },
    
    // Professional Information
    lawFirm: {
        type: String,
        required: true
    },
    barNumber: {
        type: String,
        required: true
    },
    countryOfPractice: {
        type: String,
        required: true
    },
    territory: {
        type: String,
        required: true
    },
    experience: String,
    specialization: [String],
    
    // Documents
    barCertificate: {
        url: String,
        filename: String,
        uploadedAt: Date
    },
    firmRegistration: {
        url: String,
        filename: String,
        uploadedAt: Date
    },
    
    // REVAAMP Partner Solicitor Specific
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
        mandateAccepted: {
            type: Boolean,
            default: false
        },
        mandateAcceptedAt: Date,
        kpiMetrics: {
            transactionsInitiated: { type: Number, default: 0 },
            promotersOnboarded: { type: Number, default: 0 },
            cooperativeSocietiesEstablished: { type: Number, default: 0 }
        },
        earnings: {
            totalLegalFees: { type: Number, default: 0 },
            pendingPayments: { type: Number, default: 0 },
            paidToDate: { type: Number, default: 0 }
        },
        transactions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transaction'
        }],
        referredPromoters: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    
    // Profile Image
    profileImage: {
        type: String,
        default: 'default-avatar.jpg'
    },
    
    // Account Status
    isSuspended: {
        type: Boolean,
        default: false
    },
    suspensionReason: String,
    suspendedAt: Date,
    
    // Password Reset
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
solicitorSchema.pre('save', async function(next) {
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
solicitorSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Compare password method
solicitorSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Solicitor', solicitorSchema);