// models/User.js - Add payment verification fields to propertyOwnerProfile and business partner (promoterProfile)

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
        enum: ['property_owner', 'promoter', 'business_partner', 'project_subscriber', 'admin', 'superadmin'],
        default: 'property_owner'
    },
    profileImage: {
        type: String,
        default: 'default-avatar.jpg'
    },
    bio: String,
    isSuspended: {
        type: Boolean,
        default: false
    },
    newsletter: {
        type: Boolean,
        default: false
    },
    
   // Property Owner specific fields (with payment verification only when listing)
propertyOwnerProfile: {
    company: {
        type: String,
        default: ''
    },
    rcNumber: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
    },
    verified: {
        type: Boolean,
        default: false
    },
    totalProperties: {
        type: Number,
        default: 0
    },
    totalPropertiesValue: {
        type: Number,
        default: 0
    },
    // Payment verification fields - only required when listing a property
    paymentStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'rejected', 'not_required'],
        default: 'not_required'
    },
    paymentReference: {
        type: String,
        default: ''
    },
    paymentAmount: {
        type: Number,
        default: 0
    },
    paymentDate: Date,
    paymentProofUrl: {
        type: String,
        default: ''
    },
    paymentVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    paymentVerifiedAt: Date,
    paymentNotes: {
        type: String,
        default: ''
    }
},
    
    // Promoter specific fields (NO PAYMENT REQUIRED - free to join)
    promoterProfile: {
        isApproved: {
            type: Boolean,
            default: true  // Auto-approved since no payment required
        },
        approvalDate: Date,
        registrationDate: Date,
        uniqueLink: {
            type: String,
            unique: true,
            sparse: true
        },
        socialHandle: String,
        experience: String,
        commission: {
            type: Number,
            default: 70
        },
        totalEarnings: {
            type: Number,
            default: 0
        },
        pendingWithdrawal: {
            type: Number,
            default: 0
        },
        bankDetails: {
            bankName: String,
            accountNumber: String,
            accountName: String
        },
        isActive: {
            type: Boolean,
            default: true
        },
        suspendedAt: Date,
        rejected: {
            type: Boolean,
            default: false
        },
        rejectionReason: String,
        rejectionDate: Date
    },
    
    // Business Partner specific fields (requires payment)
    businessPartnerProfile: {
        isApproved: {
            type: Boolean,
            default: false
        },
        approvalDate: Date,
        registrationDate: Date,
        uniqueLink: {
            type: String,
            unique: true,
            sparse: true
        },
        socialHandle: String,
        experience: String,
        commission: {
            type: Number,
            default: 70
        },
        totalEarnings: {
            type: Number,
            default: 0
        },
        pendingWithdrawal: {
            type: Number,
            default: 0
        },
        bankDetails: {
            bankName: String,
            accountNumber: String,
            accountName: String
        },
        isActive: {
            type: Boolean,
            default: true
        },
        suspendedAt: Date,
        rejected: {
            type: Boolean,
            default: false
        },
        rejectionReason: String,
        rejectionDate: Date,
        // Payment verification fields for Business Partner
        paymentStatus: {
            type: String,
            enum: ['pending', 'confirmed', 'rejected'],
            default: 'pending'
        },
        paymentReference: String,
        paymentAmount: {
            type: Number,
            default: 20000
        },
        paymentDate: Date,
        paymentProofUrl: String,
        paymentVerifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        paymentVerifiedAt: Date,
        paymentNotes: String
    },
    
    // Project Management Subscriber specific fields
    projectSubscriberProfile: {
        isApproved: {
            type: Boolean,
            default: false
        },
        approvalDate: Date,
        subscriptionDate: Date,
        subscriptionPlan: {
            type: String,
            enum: ['basic', 'premium', 'enterprise'],
            default: 'basic'
        },
        subscriptionStatus: {
            type: String,
            enum: ['active', 'inactive', 'suspended', 'expired'],
            default: 'inactive'
        },
        subscriptionExpiry: Date,
        countryOfResidence: String,
        passportNumber: String,
        identificationDoc: String,
        proofOfAddress: String,
        bankGuarantee: {
            amount: Number,
            bankName: String,
            referenceNumber: String,
            documentUrl: String,
            issueDate: Date,
            expiryDate: Date,
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected', 'expired'],
                default: 'pending'
            }
        },
        projects: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project'
        }],
        totalProjects: {
            type: Number,
            default: 0
        },
        totalProjectValue: {
            type: Number,
            default: 0
        },
        serviceFee: {
            type: Number,
            default: 0
        },
        paymentHistory: [{
            amount: Number,
            date: Date,
            reference: String,
            description: String
        }]
    },
    
    // Referral statistics
    referralStats: {
        totalClicks: {
            type: Number,
            default: 0
        },
        totalTransactions: {
            type: Number,
            default: 0
        },
        totalPropertiesShared: {
            type: Number,
            default: 0
        }
    },
    
    // User preferences
    preferences: {
        emailInquiries: { type: Boolean, default: true },
        emailTransactions: { type: Boolean, default: true },
        weeklyNewsletter: { type: Boolean, default: false },
        marketingEmails: { type: Boolean, default: false }
    },
    
    // Password reset
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
userSchema.pre('save', async function(next) {
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
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate unique referral link for promoters/business partners
userSchema.methods.generateUniqueLink = function() {
    const uniqueId = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    if (this.userType === 'promoter') {
        this.promoterProfile.uniqueLink = uniqueId;
    } else if (this.userType === 'business_partner') {
        this.businessPartnerProfile.uniqueLink = uniqueId;
    }
    return uniqueId;
};

module.exports = mongoose.model('User', userSchema);