// models/HectareSolicitor.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const hectareSolicitorSchema = new mongoose.Schema({
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
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    barNumber: {
        type: String,
        required: true,
        trim: true
    },
    countryOfPractice: {
        type: String,
        required: true,
        trim: true
    },
    // Optional fields - NOT required for Hectare Solicitor
    lawFirm: {
        type: String,
        trim: true,
        default: '',
        required: false  // Make this NOT required
    },
    experience: {
        type: String,
        default: '',
        required: false  // Make this NOT required
    },
    territory: {
        type: String,
        default: '',
        required: false
    },
    // Optional document uploads
    barCertificate: {
        url: {
            type: String,
            default: ''
        },
        filename: {
            type: String,
            default: ''
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    professionalProfile: {
        url: {
            type: String,
            default: ''
        },
        filename: {
            type: String,
            default: ''
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    hectareProfile: {
        isActive: {
            type: Boolean,
            default: false
        },
        approvedAt: Date,
        rejectionReason: String,
        registeredAt: {
            type: Date,
            default: Date.now
        },
        earnings: {
            totalFees: {
                type: Number,
                default: 0
            },
            pendingPayments: {
                type: Number,
                default: 0
            },
            paidFees: {
                type: Number,
                default: 0
            }
        },
        cooperativeSocietiesAssigned: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Cooperative'
        }],
        skillsAcquired: [{
            type: String
        }],
        performanceMetrics: {
            transactionsHandled: {
                type: Number,
                default: 0
            },
            clientSatisfaction: {
                type: Number,
                default: 0
            },
            responseTime: {
                type: Number,
                default: 0
            }
        }
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

// Compare password method
hectareSolicitorSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update timestamp on save
hectareSolicitorSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('HectareSolicitor', hectareSolicitorSchema);