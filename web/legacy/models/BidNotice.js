const mongoose = require('mongoose');

const bidNoticeSchema = new mongoose.Schema({
    title: { type: String, default: 'BID NOTICE TO REVAAMP VALUE PARTNERS' },
    description: { type: String, required: true },
    transactionNumber: { type: String, required: true },
    client: { type: String, required: true },
    totalLots: { type: Number, required: true },
    transactionPricePerLot: { type: Number, required: true },
    transactionCostPerLot: { type: Number, required: true },
    profitPerLot: { type: Number, required: true },
    deadline: { type: Date, required: true },
    deadlineText: { type: String },
    paymentDays: { type: Number, default: 2 },
    paymentToPartnerDays: { type: Number, default: 9 },
    conditions: [{ type: String }],
    allocationCriteria: [{ type: String }],
    importantNotes: [{ type: String }],
    status: { type: String, enum: ['active', 'closed', 'draft'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('BidNotice', bidNoticeSchema);
