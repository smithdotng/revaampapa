// models/Project.js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    // Basic Information
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    projectType: {
        type: String,
        enum: ['residential', 'commercial', 'industrial', 'infrastructure', 'renovation'],
        required: true
    },
    
    // Location
    location: {
        address: String,
        city: String,
        state: String,
        lga: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    
    // Project Details
    projectValue: {
        type: Number,
        required: true
    },
    projectDuration: {
        type: Number, // in months
        required: true
    },
    startDate: Date,
    expectedCompletionDate: Date,
    actualCompletionDate: Date,
    
    // Bank Guarantee
    bankGuarantee: {
        amount: {
            type: Number,
            required: true
        },
        bankName: {
            type: String,
            required: true
        },
        referenceNumber: {
            type: String,
            required: true
        },
        documentUrl: String,
        issueDate: Date,
        expiryDate: Date,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'expired'],
            default: 'pending'
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verifiedAt: Date
    },
    
    // Funding
    fundingSource: {
        type: String,
        enum: ['bank_guarantee', 'subscriber_funds', 'revaamp_funding'],
        default: 'bank_guarantee'
    },
    revaampFundingAmount: {
        type: Number,
        default: 0
    },
    subscriberContribution: {
        type: Number,
        default: 0
    },
    
    // Project Status
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled'],
        default: 'draft'
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    
    // Milestones
    milestones: [{
        title: String,
        description: String,
        dueDate: Date,
        completedDate: Date,
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'delayed'],
            default: 'pending'
        },
        percentage: Number,
        documents: [{
            name: String,
            url: String,
            uploadedAt: Date
        }]
    }],
    
    // Documents
    documents: [{
        name: String,
        type: {
            type: String,
            enum: ['contract', 'blueprint', 'permit', 'invoice', 'report', 'other']
        },
        url: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Team
    projectManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedTeam: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Financials
    budget: {
        total: Number,
        spent: {
            type: Number,
            default: 0
        },
        remaining: {
            type: Number,
            default: 0
        },
        expenses: [{
            category: String,
            amount: Number,
            description: String,
            date: Date,
            receipt: String,
            approvedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }]
    },
    
    // Updates
    updates: [{
        title: String,
        content: String,
        images: [String],
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        postedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Subscriber (Project Owner)
    subscriber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Service Fee
    serviceFee: {
        percentage: {
            type: Number,
            default: 10
        },
        amount: Number,
        paid: {
            type: Boolean,
            default: false
        },
        paymentReference: String,
        paidAt: Date
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

// Update timestamp on save
projectSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Calculate project progress
projectSchema.methods.calculateProgress = function() {
    if (this.milestones.length === 0) return 0;
    const totalPercentage = this.milestones.reduce((sum, m) => sum + (m.percentage || 0), 0);
    return Math.round(totalPercentage / this.milestones.length);
};

// Check if bank guarantee is valid
projectSchema.methods.isBankGuaranteeValid = function() {
    return this.bankGuarantee.status === 'approved' && 
           new Date(this.bankGuarantee.expiryDate) > new Date();
};

module.exports = mongoose.model('Project', projectSchema);