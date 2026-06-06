// controllers/businessPartnerController.js
const User = require('../models/User');
const Property = require('../models/Property');
const Transaction = require('../models/Transaction');
const Promotion = require('../models/Promotion');
const ClickTracking = require('../models/ClickTracking');
const ShareTracking = require('../models/ShareTracking');
const BidNotice = require('../models/BidNotice');
const Bid = require('../models/Bid');
const crypto = require('crypto');

// Helper function to get base URL
function getBaseUrl(req) {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    return `${req.protocol}://${req.get('host')}`;
}

// ============= DASHBOARD =============

// Business Partner Dashboard
exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user || user.userType !== 'business_partner') {
            req.flash('error', 'Access denied');
            return res.redirect('/login');
        }
        
        // Get statistics
        const totalClicks = await ClickTracking.countDocuments({ promoter: user._id }) || 0;
        const totalReferrals = await User.countDocuments({ referredBy: user._id }) || 0;
        const totalPropertiesShared = await Promotion.countDocuments({ promoter: user._id }) || 0;
        const totalEarnings = user.businessPartnerProfile?.totalEarnings || 0;
        const pendingWithdrawal = user.businessPartnerProfile?.pendingWithdrawal || 0;

        // Available properties for sharing (same as promoter)
        const availableProperties = await Property.find({
            verificationStatus: 'verified',
            status: 'available'
        })
        .select('title price location images propertyType transactionType slug description features _id')
        .sort('-createdAt')
        .limit(50);

        // Active bid notices posted by superadmin
        const bidNotices = await BidNotice.find({ status: 'active' })
            .sort('-createdAt');

        // This partner's submitted bids (to show status)
        const myBids = await Bid.find({ bidder: user._id })
            .populate('bidNotice', 'transactionNumber client deadline')
            .sort('-createdAt');

        res.render('business-partner/dashboard', {
            title: 'Business Partner Dashboard - RevaampAP',
            user: user,
            properties: availableProperties,
            bidNotices: bidNotices,
            myBids: myBids,
            stats: {
                totalClicks,
                totalReferrals,
                totalPropertiesShared,
                totalEarnings,
                pendingWithdrawal
            },
            currentPath: '/business-partner/dashboard'
        });
    } catch (error) {
        console.error('Business partner dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/login');
    }
};

// ============= EARNINGS =============

exports.getEarnings = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const transactions = await Transaction.find({ 
            promoter: user._id,
            paymentStatus: 'completed'
        }).populate('property', 'title').sort('-transactionDate');
        
        const totalEarnings = transactions.reduce((sum, t) => sum + (t.commissionSplit?.promoter?.amount || 0), 0);
        const pendingWithdrawal = user.businessPartnerProfile?.pendingWithdrawal || 0;
        
        res.render('business-partner/earnings', {
            title: 'My Earnings - RevaampAP',
            user: user,
            transactions: transactions,
            totals: {
                totalEarnings,
                pendingWithdrawal
            },
            currentPath: '/business-partner/earnings'
        });
    } catch (error) {
        console.error('Get earnings error:', error);
        req.flash('error', 'Error loading earnings');
        res.redirect('/business-partner/dashboard');
    }
};

// ============= REFERRAL LINK =============

exports.generateReferralLink = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        let referralCode = user.businessPartnerProfile?.referralCode;
        if (!referralCode) {
            referralCode = `BP-${user._id.toString().slice(-8)}-${Date.now()}`;
            if (!user.businessPartnerProfile) user.businessPartnerProfile = {};
            user.businessPartnerProfile.referralCode = referralCode;
            user.businessPartnerProfile.uniqueLink = referralCode;
            await user.save();
        }
        
        const referralLink = `${getBaseUrl(req)}/business-partner/register?ref=${referralCode}`;
        
        res.json({ success: true, link: referralLink, code: referralCode });
    } catch (error) {
        console.error('Generate referral link error:', error);
        res.json({ success: false, error: error.message });
    }
};

// ============= BID (Business Partner exclusive) =============

exports.getBidPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { noticeId } = req.query;

        const bidNotices = await BidNotice.find({ status: 'active' }).sort('-createdAt');
        const myBids = await Bid.find({ bidder: user._id })
            .populate('bidNotice', 'transactionNumber client')
            .sort('-createdAt');

        const selectedNotice = noticeId
            ? bidNotices.find(n => n._id.toString() === noticeId) || null
            : null;

        res.render('business-partner/bid', {
            title: 'Place a Bid - RevaampAP',
            user,
            bidNotices,
            myBids,
            selectedNotice,
            currentPath: '/business-partner/bid'
        });
    } catch (error) {
        console.error('Get bid page error:', error);
        req.flash('error', 'Error loading bid page');
        res.redirect('/business-partner/dashboard');
    }
};

exports.submitBid = async (req, res) => {
    try {
        const { bidNoticeId, numberOfLots, message } = req.body;

        if (!bidNoticeId || !numberOfLots || numberOfLots < 1) {
            req.flash('error', 'Bid notice and number of lots are required');
            return res.redirect('/business-partner/bid');
        }

        const notice = await BidNotice.findById(bidNoticeId);
        if (!notice || notice.status !== 'active') {
            req.flash('error', 'This bid notice is no longer active');
            return res.redirect('/business-partner/bid');
        }

        if (new Date() > notice.deadline) {
            req.flash('error', 'The deadline for this bid has passed');
            return res.redirect('/business-partner/bid');
        }

        const bid = new Bid({
            bidNotice: bidNoticeId,
            bidder: req.session.userId,
            numberOfLots: Number(numberOfLots),
            message: message || ''
        });

        await bid.save();

        req.flash('success', `Bid placed successfully for ${numberOfLots} lot(s) on transaction ${notice.transactionNumber}`);
        res.redirect('/business-partner/bid');
    } catch (error) {
        console.error('Submit bid error:', error);
        req.flash('error', 'Error placing bid');
        res.redirect('/business-partner/bid');
    }
};

exports.getBids = async (req, res) => {
    try {
        const bids = await Bid.find({ bidder: req.session.userId })
            .populate('bidNotice', 'transactionNumber client transactionCostPerLot profitPerLot deadline')
            .sort('-createdAt');
        res.json({ success: true, bids });
    } catch (error) {
        console.error('Get bids error:', error);
        res.json({ success: false, error: error.message });
    }
};

// ============= TRACKING =============

exports.trackShare = async (req, res) => {
    try {
        const { platform, link, linkType } = req.body;
        
        const share = new ShareTracking({
            promoter: req.session.userId,
            linkType: linkType || 'referral',
            platform: platform,
            link: link,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            sharedAt: new Date()
        });
        
        await share.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Track share error:', error);
        res.json({ success: false });
    }
};