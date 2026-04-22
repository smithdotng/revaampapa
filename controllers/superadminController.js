// controllers/superadminController.js
const User = require('../models/User');
const Property = require('../models/Property');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Promotion = require('../models/Promotion');
const Inquiry = require('../models/Inquiry');

// In superadminController.js, update the getDashboard method
exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        // Get statistics
        const totalProperties = await Property.countDocuments();
        const pendingProperties = await Property.countDocuments({ verificationStatus: 'payment_confirmed' });
        const verifiedProperties = await Property.countDocuments({ verificationStatus: 'verified' });
        const rejectedProperties = await Property.countDocuments({ verificationStatus: 'rejected' });
        
        const totalPropertyOwners = await User.countDocuments({ userType: 'property_owner' });
        const totalPromoters = await User.countDocuments({ userType: 'promoter' });
        const pendingPromoters = await User.countDocuments({ userType: 'promoter', 'promoterProfile.isApproved': false });
        const approvedPromoters = await User.countDocuments({ userType: 'promoter', 'promoterProfile.isApproved': true });
        
        const totalTransactions = await Transaction.countDocuments();
        const completedTransactions = await Transaction.countDocuments({ paymentStatus: 'completed' });
        const pendingTransactions = await Transaction.countDocuments({ paymentStatus: 'pending' });
        
        // Calculate total revenue
        const revenueResult = await Transaction.aggregate([
            { $match: { paymentStatus: 'completed' } },
            { $group: { _id: null, total: { $sum: '$commissionSplit.platform.amount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
        
        // Get inquiry statistics
        const totalInquiries = await Inquiry.countDocuments();
        const newInquiries = await Inquiry.countDocuments({ status: 'new' });
        const readInquiries = await Inquiry.countDocuments({ status: 'read' });
        const repliedInquiries = await Inquiry.countDocuments({ status: 'replied' });
        
        // Get recent inquiries
        const recentInquiries = await Inquiry.find()
            .populate('property', 'title slug')
            .sort('-createdAt')
            .limit(5);
        
        // Monthly revenue for chart
        const monthlyRevenue = await Transaction.aggregate([
            { $match: { paymentStatus: 'completed' } },
            {
                $group: {
                    _id: { 
                        year: { $year: '$transactionDate' },
                        month: { $month: '$transactionDate' }
                    },
                    total: { $sum: '$commissionSplit.platform.amount' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 }
        ]);
        
        // Recent activities
        const recentProperties = await Property.find()
            .populate('owner', 'name email')
            .sort('-createdAt')
            .limit(5);
        
        const recentTransactions = await Transaction.find()
            .populate('property', 'title')
            .populate('promoter', 'name')
            .sort('-transactionDate')
            .limit(5);
        
        const recentPromoters = await User.find({ userType: 'promoter' })
            .select('-password')
            .sort('-createdAt')
            .limit(5);
        
        // Get pending payments count
        const pendingPayments = await Property.countDocuments({ 
            verificationStatus: 'payment_confirmed',
            verificationPaymentConfirmed: true,
            status: 'payment_confirmed'
        });
        
        const stats = {
            totalProperties,
            pendingProperties,
            verifiedProperties,
            rejectedProperties,
            totalPropertyOwners,
            totalPromoters,
            pendingPromoters,
            approvedPromoters,
            totalTransactions,
            completedTransactions,
            pendingTransactions,
            totalRevenue,
            pendingPayments,
            totalInquiries,
            newInquiries,
            readInquiries,
            repliedInquiries
        };
        
        res.render('superadmin/dashboard', {
            title: 'Superadmin Dashboard - RevaampAP',
            user: user,
            stats: stats,
            monthlyRevenue: monthlyRevenue,
            recentProperties: recentProperties,
            recentTransactions: recentTransactions,
            recentPromoters: recentPromoters,
            recentInquiries: recentInquiries,
            currentPath: '/superadmin/dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/superadmin/dashboard');
    }
};

// ============= PROPERTY MANAGEMENT =============

// Get all properties
exports.getProperties = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { status, type, search, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (status && status !== 'all') {
            query.verificationStatus = status;
        }
        if (type && type !== 'all') {
            query.propertyType = type;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { 'location.city': { $regex: search, $options: 'i' } },
                { 'location.state': { $regex: search, $options: 'i' } }
            ];
        }
        
        const properties = await Property.find(query)
            .populate('owner', 'name email phone')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await Property.countDocuments(query);
        
        // Get counts for stats
        const stats = {
            total: await Property.countDocuments(),
            pending: await Property.countDocuments({ verificationStatus: 'payment_confirmed' }),
            verified: await Property.countDocuments({ verificationStatus: 'verified' }),
            rejected: await Property.countDocuments({ verificationStatus: 'rejected' })
        };
        
        res.render('superadmin/properties', {
            title: 'Property Management - RevaampAP',
            user: user,
            properties: properties,
            stats: stats,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total: total,
            filters: req.query,
            currentPath: '/superadmin/properties'
        });
    } catch (error) {
        console.error('Get properties error:', error);
        req.flash('error', 'Error loading properties');
        res.redirect('/superadmin/dashboard');
    }
};

// Get pending properties (payment confirmed, awaiting verification)
exports.getPendingProperties = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const properties = await Property.find({ 
            verificationStatus: 'payment_confirmed'
        }).populate('owner', 'name email phone');
        
        res.render('superadmin/pending-properties', {
            title: 'Pending Properties - RevaampAP',
            user: user,
            properties: properties,
            currentPath: '/superadmin/properties'
        });
    } catch (error) {
        console.error('Get pending properties error:', error);
        req.flash('error', 'Error loading pending properties');
        res.redirect('/superadmin/dashboard');
    }
};

// Get single property details
exports.getPropertyDetails = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const property = await Property.findById(req.params.id)
            .populate('owner', 'name email phone propertyOwnerProfile');
        
        if (!property) {
            req.flash('error', 'Property not found');
            return res.redirect('/superadmin/properties');
        }
        
        res.render('superadmin/property-detail', {
            title: `Property: ${property.title} - RevaampAP`,
            user: user,
            property: property,
            currentPath: '/superadmin/properties'
        });
    } catch (error) {
        console.error('Get property details error:', error);
        req.flash('error', 'Error loading property details');
        res.redirect('/superadmin/properties');
    }
};

// Confirm payment for property verification
exports.confirmPayment = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        property.verificationStatus = 'payment_confirmed';
        property.status = 'payment_confirmed';
        property.verificationPaymentConfirmed = true;
        property.verificationPaymentConfirmedBy = req.session.userId;
        property.verificationPaymentConfirmedAt = new Date();
        await property.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ error: 'Error confirming payment' });
    }
};

// Verify property (approve and make live)
exports.verifyProperty = async (req, res) => {
    try {
        const { feedback } = req.body;
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        property.verificationStatus = 'verified';
        property.status = 'available';
        property.verificationFeedback = {
            message: feedback || 'Property verified successfully',
            providedBy: req.session.userId,
            providedAt: new Date()
        };
        await property.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Verify property error:', error);
        res.status(500).json({ error: 'Error verifying property' });
    }
};

// Reject property
exports.rejectProperty = async (req, res) => {
    try {
        const { reason } = req.body;
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        property.verificationStatus = 'rejected';
        property.status = 'rejected';
        property.verificationFeedback = {
            message: reason || 'Property verification failed',
            providedBy: req.session.userId,
            providedAt: new Date()
        };
        await property.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Reject property error:', error);
        res.status(500).json({ error: 'Error rejecting property' });
    }
};

// Feature/unfeature property
exports.featureProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        property.featured = !property.featured;
        if (property.featured) {
            property.featuredExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
        await property.save();
        
        res.json({ success: true, featured: property.featured });
    } catch (error) {
        console.error('Feature property error:', error);
        res.status(500).json({ error: 'Error featuring property' });
    }
};

// Delete property
exports.deleteProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        await property.deleteOne();
        res.json({ success: true });
    } catch (error) {
        console.error('Delete property error:', error);
        res.status(500).json({ error: 'Error deleting property' });
    }
};

// ============= PROMOTER MANAGEMENT =============

// Get all promoters
exports.getPromoters = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { status, search, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = { userType: 'promoter' };
        
        if (status === 'approved') {
            query['promoterProfile.isApproved'] = true;
        } else if (status === 'pending') {
            query['promoterProfile.isApproved'] = false;
        } else if (status === 'suspended') {
            query['promoterProfile.isActive'] = false;
        }
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        
        const promoters = await User.find(query)
            .select('-password')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await User.countDocuments(query);
        
        const stats = {
            total: await User.countDocuments({ userType: 'promoter' }),
            approved: await User.countDocuments({ userType: 'promoter', 'promoterProfile.isApproved': true }),
            pending: await User.countDocuments({ userType: 'promoter', 'promoterProfile.isApproved': false }),
            suspended: await User.countDocuments({ userType: 'promoter', 'promoterProfile.isActive': false })
        };
        
        res.render('superadmin/promoters', {
            title: 'Promoter Management - RevaampAP',
            user: user,
            promoters: promoters,
            stats: stats,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total: total,
            filters: req.query,
            currentPath: '/superadmin/promoters'
        });
    } catch (error) {
        console.error('Get promoters error:', error);
        req.flash('error', 'Error loading promoters');
        res.redirect('/superadmin/dashboard');
    }
};

// Get pending promoters
exports.getPendingPromoters = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const promoters = await User.find({ 
            userType: 'promoter',
            'promoterProfile.isApproved': false
        }).select('-password').sort('-createdAt');
        
        res.render('superadmin/pending-promoters', {
            title: 'Pending Promoter Approvals - RevaampAP',
            user: user,
            promoters: promoters,
            currentPath: '/superadmin/promoters'
        });
    } catch (error) {
        console.error('Get pending promoters error:', error);
        req.flash('error', 'Error loading pending promoters');
        res.redirect('/superadmin/dashboard');
    }
};

// Approve promoter
exports.approvePromoter = async (req, res) => {
    try {
        const promoter = await User.findById(req.params.id);
        
        if (!promoter) {
            return res.status(404).json({ error: 'Promoter not found' });
        }
        
        promoter.promoterProfile.isApproved = true;
        promoter.promoterProfile.approvalDate = new Date();
        promoter.promoterProfile.rejected = false;
        await promoter.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Approve promoter error:', error);
        res.status(500).json({ error: 'Error approving promoter' });
    }
};

// Reject promoter
exports.rejectPromoter = async (req, res) => {
    try {
        const { reason } = req.body;
        const promoter = await User.findById(req.params.id);
        
        if (!promoter) {
            return res.status(404).json({ error: 'Promoter not found' });
        }
        
        promoter.promoterProfile.rejected = true;
        promoter.promoterProfile.rejectionReason = reason || 'Application rejected';
        promoter.promoterProfile.rejectionDate = new Date();
        promoter.promoterProfile.isApproved = false;
        await promoter.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Reject promoter error:', error);
        res.status(500).json({ error: 'Error rejecting promoter' });
    }
};

// Suspend promoter
exports.suspendPromoter = async (req, res) => {
    try {
        const promoter = await User.findById(req.params.id);
        
        if (!promoter) {
            return res.status(404).json({ error: 'Promoter not found' });
        }
        
        promoter.promoterProfile.isActive = !promoter.promoterProfile.isActive;
        promoter.promoterProfile.suspendedAt = promoter.promoterProfile.isActive ? null : new Date();
        await promoter.save();
        
        res.json({ success: true, suspended: !promoter.promoterProfile.isActive });
    } catch (error) {
        console.error('Suspend promoter error:', error);
        res.status(500).json({ error: 'Error suspending promoter' });
    }
};

// Get promoter transactions
exports.getPromoterTransactions = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const promoter = await User.findById(req.params.id).select('-password');
        
        if (!promoter) {
            req.flash('error', 'Promoter not found');
            return res.redirect('/superadmin/promoters');
        }
        
        const transactions = await Transaction.find({ promoter: req.params.id })
            .populate('property', 'title price location')
            .sort('-transactionDate');
        
        const totalEarnings = transactions.reduce((sum, t) => sum + (t.commissionSplit?.promoter?.amount || 0), 0);
        
        res.render('superadmin/promoter-transactions', {
            title: `Promoter Transactions: ${promoter.name} - RevaampAP`,
            user: user,
            promoter: promoter,
            transactions: transactions,
            totalEarnings: totalEarnings,
            currentPath: '/superadmin/promoters'
        });
    } catch (error) {
        console.error('Get promoter transactions error:', error);
        req.flash('error', 'Error loading promoter transactions');
        res.redirect('/superadmin/promoters');
    }
};

// ============= PROPERTY OWNER MANAGEMENT =============

// Get all property owners
exports.getPropertyOwners = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { search, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = { userType: 'property_owner' };
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        
        const propertyOwners = await User.find(query)
            .select('-password')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await User.countDocuments(query);
        
        res.render('superadmin/property-owners', {
            title: 'Property Owners - RevaampAP',
            user: user,
            propertyOwners: propertyOwners,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total: total,
            filters: req.query,
            currentPath: '/superadmin/property-owners'
        });
    } catch (error) {
        console.error('Get property owners error:', error);
        req.flash('error', 'Error loading property owners');
        res.redirect('/superadmin/dashboard');
    }
};

// Get property owner details
exports.getPropertyOwnerDetails = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const propertyOwner = await User.findById(req.params.id).select('-password');
        
        if (!propertyOwner || propertyOwner.userType !== 'property_owner') {
            req.flash('error', 'Property owner not found');
            return res.redirect('/superadmin/property-owners');
        }
        
        const properties = await Property.find({ owner: propertyOwner._id }).sort('-createdAt');
        
        const totalProperties = properties.length;
        const verifiedProperties = properties.filter(p => p.verificationStatus === 'verified').length;
        const pendingProperties = properties.filter(p => p.verificationStatus === 'payment_confirmed').length;
        const totalPropertiesValue = properties.reduce((sum, p) => sum + p.price, 0);
        
        res.render('superadmin/property-owner-detail', {
            title: `Property Owner: ${propertyOwner.name} - RevaampAP`,
            user: user,
            propertyOwner: propertyOwner,
            properties: properties,
            stats: {
                totalProperties,
                verifiedProperties,
                pendingProperties,
                totalPropertiesValue
            },
            currentPath: '/superadmin/property-owners'
        });
    } catch (error) {
        console.error('Get property owner details error:', error);
        req.flash('error', 'Error loading property owner details');
        res.redirect('/superadmin/property-owners');
    }
};

// ============= TRANSACTION MANAGEMENT =============

// Get all transactions
exports.getTransactions = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { status, promoterId, startDate, endDate, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (status && status !== 'all') {
            query.paymentStatus = status;
        }
        if (promoterId) {
            query.promoter = promoterId;
        }
        if (startDate || endDate) {
            query.transactionDate = {};
            if (startDate) query.transactionDate.$gte = new Date(startDate);
            if (endDate) query.transactionDate.$lte = new Date(endDate);
        }
        
        const transactions = await Transaction.find(query)
            .populate('property', 'title price location')
            .populate('promoter', 'name email')
            .sort('-transactionDate')
            .skip(skip)
            .limit(limit);
        
        const total = await Transaction.countDocuments(query);
        
        // Calculate totals
        const totalRevenue = await Transaction.aggregate([
            { $match: { paymentStatus: 'completed' } },
            { $group: { _id: null, total: { $sum: '$commissionSplit.platform.amount' } } }
        ]);
        
        const promoters = await User.find({ userType: 'promoter' }).select('name');
        
        res.render('superadmin/transactions', {
            title: 'Transactions - RevaampAP',
            user: user,
            transactions: transactions,
            promoters: promoters,
            totalRevenue: totalRevenue[0]?.total || 0,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total: total,
            filters: req.query,
            currentPath: '/superadmin/transactions'
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        req.flash('error', 'Error loading transactions');
        res.redirect('/superadmin/dashboard');
    }
};

// Get single transaction details
exports.getTransactionDetails = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const transaction = await Transaction.findById(req.params.id)
            .populate('property', 'title price location images')
            .populate('promoter', 'name email phone promoterProfile');
        
        if (!transaction) {
            req.flash('error', 'Transaction not found');
            return res.redirect('/superadmin/transactions');
        }
        
        res.render('superadmin/transaction-detail', {
            title: 'Transaction Details - RevaampAP',
            user: user,
            transaction: transaction,
            currentPath: '/superadmin/transactions'
        });
    } catch (error) {
        console.error('Get transaction details error:', error);
        req.flash('error', 'Error loading transaction details');
        res.redirect('/superadmin/transactions');
    }
};

// ============= WITHDRAWAL MANAGEMENT =============

// Get all withdrawals
exports.getWithdrawals = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { status, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const withdrawals = await Withdrawal.find(query)
            .populate('promoter', 'name email phone')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await Withdrawal.countDocuments(query);
        
        const stats = {
            pending: await Withdrawal.countDocuments({ status: 'pending' }),
            approved: await Withdrawal.countDocuments({ status: 'approved' }),
            processed: await Withdrawal.countDocuments({ status: 'processed' }),
            rejected: await Withdrawal.countDocuments({ status: 'rejected' }),
            totalAmount: await Withdrawal.aggregate([
                { $match: { status: 'processed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        };
        
        res.render('superadmin/withdrawals', {
            title: 'Withdrawal Requests - RevaampAP',
            user: user,
            withdrawals: withdrawals,
            stats: stats,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total: total,
            filters: req.query,
            currentPath: '/superadmin/withdrawals'
        });
    } catch (error) {
        console.error('Get withdrawals error:', error);
        req.flash('error', 'Error loading withdrawals');
        res.redirect('/superadmin/dashboard');
    }
};

// Process withdrawal (approve)
exports.processWithdrawal = async (req, res) => {
    try {
        const withdrawal = await Withdrawal.findById(req.params.id);
        
        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }
        
        withdrawal.status = 'processed';
        withdrawal.processedAt = new Date();
        withdrawal.transactionReference = req.body.reference || `WD-${Date.now()}`;
        withdrawal.adminNotes = req.body.notes || '';
        await withdrawal.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Process withdrawal error:', error);
        res.status(500).json({ error: 'Error processing withdrawal' });
    }
};

// Reject withdrawal
exports.rejectWithdrawal = async (req, res) => {
    try {
        const withdrawal = await Withdrawal.findById(req.params.id);
        
        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }
        
        withdrawal.status = 'rejected';
        withdrawal.adminNotes = req.body.reason || 'Withdrawal request rejected';
        await withdrawal.save();
        
        // Return funds to promoter's pending withdrawal
        const promoter = await User.findById(withdrawal.promoter);
        if (promoter) {
            promoter.promoterProfile.pendingWithdrawal += withdrawal.amount;
            await promoter.save();
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Reject withdrawal error:', error);
        res.status(500).json({ error: 'Error rejecting withdrawal' });
    }
};

// ============= ANALYTICS =============

// Analytics dashboard
exports.getAnalytics = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { period = 'month' } = req.query;
        
        // Get date range
        const endDate = new Date();
        let startDate = new Date();
        
        if (period === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        } else if (period === 'year') {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }
        
        // Property listing trends
        const propertyListings = await Property.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { '_id': 1 } }
        ]);
        
        // Transaction trends
        const transactionTrends = await Transaction.aggregate([
            { $match: { transactionDate: { $gte: startDate, $lte: endDate }, paymentStatus: 'completed' } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } }, count: { $sum: 1 }, revenue: { $sum: '$commissionSplit.platform.amount' } } },
            { $sort: { '_id': 1 } }
        ]);
        
        // User registration trends
        const userRegistrations = await User.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { '_id': 1 } }
        ]);
        
        // Property type distribution
        const propertyTypes = await Property.aggregate([
            { $group: { _id: '$propertyType', count: { $sum: 1 } } }
        ]);
        
        // Top promoters by earnings
        const topPromoters = await Transaction.aggregate([
            { $match: { paymentStatus: 'completed' } },
            { $group: { _id: '$promoter', totalEarnings: { $sum: '$commissionSplit.promoter.amount' }, transactionCount: { $sum: 1 } } },
            { $sort: { totalEarnings: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'promoterInfo' } }
        ]);
        
        res.render('superadmin/analytics', {
            title: 'Analytics - RevaampAP',
            user: user,
            propertyListings,
            transactionTrends,
            userRegistrations,
            propertyTypes,
            topPromoters,
            period,
            currentPath: '/superadmin/analytics'
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        req.flash('error', 'Error loading analytics');
        res.redirect('/superadmin/dashboard');
    }
};

// API: Get revenue data for charts
exports.getRevenueData = async (req, res) => {
    try {
        const { period } = req.query;
        let labels = [];
        let values = [];
        let startDate = new Date();
        
        if (period === 'week') {
            startDate.setDate(startDate.getDate() - 7);
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('en-NG', { weekday: 'short' }));
            }
        } else if (period === 'month') {
            startDate.setDate(1);
            const daysInMonth = new Date().getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                labels.push(`Day ${i}`);
            }
        } else if (period === 'year') {
            startDate.setFullYear(startDate.getFullYear() - 1);
            for (let i = 11; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                labels.push(date.toLocaleDateString('en-NG', { month: 'short' }));
            }
        }
        
        const revenue = await Transaction.aggregate([
            { $match: { paymentStatus: 'completed', transactionDate: { $gte: startDate } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } }, total: { $sum: '$commissionSplit.platform.amount' } } }
        ]);
        
        res.json({ labels, values });
    } catch (error) {
        console.error('Revenue data error:', error);
        res.json({ labels: [], values: [] });
    }
};

// API: Get property distribution
exports.getPropertyDistribution = async (req, res) => {
    try {
        const distribution = await Property.aggregate([
            { $group: { _id: '$propertyType', count: { $sum: 1 } } }
        ]);
        
        const labels = distribution.map(d => d._id);
        const values = distribution.map(d => d.count);
        
        res.json({ labels, values });
    } catch (error) {
        console.error('Property distribution error:', error);
        res.json({ labels: [], values: [] });
    }
};

// ============= SETTINGS =============

// Get settings page
exports.getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('superadmin/settings', {
            title: 'Platform Settings - RevaampAP',
            user: user,
            settings: {
                verificationFee: process.env.VERIFICATION_FEE || 20000,
                promoterCommission: process.env.PROMOTER_COMMISSION || 70,
                platformCommission: process.env.PLATFORM_COMMISSION || 20,
                ownerCommission: process.env.OWNER_COMMISSION || 10,
                siteName: 'RevaampAP',
                siteEmail: 'info@revaampap.com',
                sitePhone: '+234 800 000 0000',
                siteAddress: 'Abuja, Nigeria'
            },
            currentPath: '/superadmin/settings'
        });
    } catch (error) {
        console.error('Get settings error:', error);
        req.flash('error', 'Error loading settings');
        res.redirect('/superadmin/dashboard');
    }
};

// Update settings
exports.updateSettings = async (req, res) => {
    try {
        const { verificationFee, promoterCommission, platformCommission, ownerCommission, siteName, siteEmail, sitePhone, siteAddress } = req.body;
        
        // In production, save to database or .env
        process.env.VERIFICATION_FEE = verificationFee;
        process.env.PROMOTER_COMMISSION = promoterCommission;
        process.env.PLATFORM_COMMISSION = platformCommission;
        process.env.OWNER_COMMISSION = ownerCommission;
        
        req.flash('success', 'Settings updated successfully');
        res.redirect('/superadmin/settings');
    } catch (error) {
        console.error('Update settings error:', error);
        req.flash('error', 'Error updating settings');
        res.redirect('/superadmin/settings');
    }
};

// ============= PROFILE =============

// Get profile page
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        
        res.render('superadmin/profile', {
            title: 'Profile - RevaampAP',
            user: user,
            currentPath: '/superadmin/profile'
        });
    } catch (error) {
        console.error('Get profile error:', error);
        req.flash('error', 'Error loading profile');
        res.redirect('/superadmin/dashboard');
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, bio } = req.body;
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/superadmin/profile');
        }
        
        user.name = name;
        user.phone = phone;
        user.bio = bio;
        await user.save();
        
        req.flash('success', 'Profile updated successfully');
        res.redirect('/superadmin/profile');
    } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/superadmin/profile');
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/superadmin/profile');
        }
        
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/superadmin/profile');
        }
        
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/superadmin/profile');
        }
        
        if (newPassword.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/superadmin/profile');
        }
        
        user.password = newPassword;
        await user.save();
        
        req.flash('success', 'Password changed successfully');
        res.redirect('/superadmin/profile');
    } catch (error) {
        console.error('Change password error:', error);
        req.flash('error', 'Error changing password');
        res.redirect('/superadmin/profile');
    }
};

// Get pending payments for verification
// Fix the getPendingPayments method - change from 'admin/payment-verifications' to 'superadmin/payment-verifications'
exports.getPendingPayments = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        // Find properties with payment_confirmed status but not yet verified
        const pendingPayments = await Property.find({ 
            verificationStatus: 'payment_confirmed',
            verificationPaymentConfirmed: true,
            status: 'payment_confirmed'
        }).populate('owner', 'name email phone');
        
        // Get recently verified (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentlyVerified = await Property.find({
            verificationStatus: 'verified',
            verificationPaymentConfirmedAt: { $gte: thirtyDaysAgo }
        }).populate('owner', 'name').limit(10);
        
        const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.verificationFee || 20000), 0);
        
        // FIXED: Changed from 'admin/payment-verifications' to 'superadmin/payment-verifications'
        res.render('superadmin/payment-verifications', {
            title: 'Payment Verifications - RevaampAP',
            user: user,
            pendingPayments: pendingPayments,
            recentlyVerified: recentlyVerified,
            pendingCount: pendingPayments.length,
            verifiedCount: recentlyVerified.length,
            totalPendingAmount: totalPendingAmount,
            currentPath: '/superadmin/payments/pending'
        });
    } catch (error) {
        console.error('Get pending payments error:', error);
        req.flash('error', 'Error loading payment verifications');
        res.redirect('/superadmin/dashboard');
    }
};

// Verify payment and approve property
exports.verifyPayment = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        // Update property status
        property.verificationStatus = 'verified';
        property.status = 'available';
        property.verificationPaymentConfirmedBy = req.session.userId;
        property.verificationPaymentConfirmedAt = new Date();
        
        await property.save();
        
        // Send notification email to property owner
        try {
            const emailService = require('../utils/email');
            await emailService.sendPropertyVerifiedEmail(property.owner, property);
        } catch (emailError) {
            console.error('Email error:', emailError.message);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Error verifying payment' });
    }
};

// Reject payment
exports.rejectPayment = async (req, res) => {
    try {
        const { reason } = req.body;
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        // Update property status
        property.verificationStatus = 'rejected';
        property.status = 'rejected';
        property.verificationFeedback = {
            message: reason || 'Payment verification failed',
            providedBy: req.session.userId,
            providedAt: new Date()
        };
        
        await property.save();
        
        // Send notification email to property owner
        try {
            const emailService = require('../utils/email');
            await emailService.sendPropertyRejectedEmail(property.owner, property, reason);
        } catch (emailError) {
            console.error('Email error:', emailError.message);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Reject payment error:', error);
        res.status(500).json({ error: 'Error rejecting payment' });
    }
};