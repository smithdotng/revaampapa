// controllers/businessPartnerController.js
const User = require('../models/User');
const Property = require('../models/Property');
const Transaction = require('../models/Transaction');
const Promotion = require('../models/Promotion');
const ClickTracking = require('../models/ClickTracking');
const ShareTracking = require('../models/ShareTracking');
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
        
        res.render('business-partner/dashboard', {
            title: 'Business Partner Dashboard - RevaampAP',
            user: user,
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