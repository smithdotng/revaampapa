// models/HectareSolicitor.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const hectareSolicitorSchema = new mongoose.Schema({
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
        enum: ['hectare_solicitor', 'solicitor', 'admin', 'superadmin'],
        default: 'hectare_solicitor'
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
    experience: String,
    specialization: [String],
    
    // Documents
    barCertificate: {
        url: String,
        filename: String,
        uploadedAt: Date
    },
    
    // Hectare by Hectare Specific
    hectareProfile: {
        isActive: {
            type: Boolean,
            default: false
        },
        approvedAt: Date,
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        assignedCooperative: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Cooperative'
        },
        cooperativeSocieties: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Cooperative'
        }],
        servicesProvided: [{
            type: String,
            enum: ['legal_advice', 'corporate_governance', 'dispute_resolution', 'compliance', 'due_diligence', 'transaction_structuring']
        }],
        earnings: {
            totalFees: { type: Number, default: 0 },
            pendingPayments: { type: Number, default: 0 },
            paidToDate: { type: Number, default: 0 }
        },
        skillsAcquired: [String]
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
hectareSolicitorSchema.pre('save', async function(next) {
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
hectareSolicitorSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Compare password method
hectareSolicitorSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('HectareSolicitor', hectareSolicitorSchema);