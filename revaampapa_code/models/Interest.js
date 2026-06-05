// models/Interest.js
const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
    promotion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Promotion'
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property'
    },
    promoter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: String,
    message: String,
    status: {
        type: String,
        enum: ['new', 'contacted', 'converted', 'closed'],
        default: 'new'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Interest', interestSchema);