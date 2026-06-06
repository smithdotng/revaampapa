const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
    bidNotice: { type: mongoose.Schema.Types.ObjectId, ref: 'BidNotice', required: true },
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    numberOfLots: { type: Number, required: true, min: 1 },
    totalCost: { type: Number },
    message: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminNote: { type: String }
}, { timestamps: true });

// Pre-save: auto-compute total cost
bidSchema.pre('save', async function(next) {
    if (this.isModified('numberOfLots') || this.isNew) {
        const BidNotice = mongoose.model('BidNotice');
        const notice = await BidNotice.findById(this.bidNotice);
        if (notice) {
            this.totalCost = this.numberOfLots * notice.transactionCostPerLot;
        }
    }
    next();
});

module.exports = mongoose.model('Bid', bidSchema);
