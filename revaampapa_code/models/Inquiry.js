const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    propertyOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['new', 'read', 'replied', 'archived', 'spam'],
        default: 'new'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: Date,
    repliedAt: Date,
    replyMessage: String,
    repliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: [{
        note: String,
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
inquirySchema.index({ property: 1, createdAt: -1 });
inquirySchema.index({ email: 1 });
inquirySchema.index({ status: 1 });
inquirySchema.index({ isRead: 1 });

module.exports = mongoose.model('Inquiry', inquirySchema);