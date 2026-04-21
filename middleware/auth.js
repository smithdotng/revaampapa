// middleware/auth.js
const User = require('../models/User');

const authMiddleware = {
    // Check if user is logged in
    isAuthenticated: (req, res, next) => {
        if (req.session.userId) {
            return next();
        }
        req.flash('error', 'Please login to access this page');
        res.redirect('/login');
    },

    // Check if user is a property owner
    isPropertyOwner: (req, res, next) => {
        if (req.session.userType === 'property_owner') {
            return next();
        }
        req.flash('error', 'Access denied. Property owner only area.');
        if (req.path !== '/dashboard') {
            return res.redirect('/dashboard');
        }
        return res.redirect('/');
    },

    // Check if user is a promoter
    isPromoter: (req, res, next) => {
        if (req.session.userType === 'promoter') {
            return next();
        }
        req.flash('error', 'Access denied. Promoter only area.');
        if (req.path !== '/dashboard') {
            return res.redirect('/dashboard');
        }
        return res.redirect('/');
    },

    // Check if user is admin or superadmin
    isAdmin: (req, res, next) => {
        if (req.session.userType === 'admin' || req.session.userType === 'superadmin') {
            return next();
        }
        req.flash('error', 'Access denied. Admin only area.');
        return res.redirect('/dashboard');
    },

    // Check if user is superadmin
    isSuperadmin: (req, res, next) => {
        if (req.session.userType === 'superadmin') {
            return next();
        }
        req.flash('error', 'Access denied. Superadmin only area.');
        return res.redirect('/superadmin/dashboard');
    },

    // Check if promoter is approved
    isPromoterApproved: async (req, res, next) => {
        try {
            const user = await User.findById(req.session.userId);
            if (user.userType === 'promoter' && user.promoterProfile.isApproved) {
                return next();
            }
            req.flash('error', 'Your promoter account is pending approval');
            res.redirect('/promoter/pending');
        } catch (error) {
            next(error);
        }
    },

    // Check if user is a business partner
    isBusinessPartner: (req, res, next) => {
        if (req.session.userType === 'business_partner') {
            return next();
        }
        req.flash('error', 'Access denied. Business Partner only area.');
        if (req.path !== '/dashboard') {
            return res.redirect('/dashboard');
        }
        return res.redirect('/');
    },

    // Check if business partner is approved and payment confirmed
    isBusinessPartnerActive: async (req, res, next) => {
        try {
            const user = await User.findById(req.session.userId);
            if (user.userType === 'business_partner' && 
                user.businessPartnerProfile.isApproved && 
                user.businessPartnerProfile.paymentStatus === 'confirmed') {
                return next();
            }
            req.flash('error', 'Your account is pending payment verification. Please wait for admin confirmation.');
            res.redirect('/business-partner/verify');
        } catch (error) {
            next(error);
        }
    },

    // Check if user is a project subscriber
    isProjectSubscriber: (req, res, next) => {
        if (req.session.userType === 'project_subscriber') {
            return next();
        }
        req.flash('error', 'Access denied. Project Management Subscriber only area.');
        if (req.path !== '/dashboard') {
            return res.redirect('/dashboard');
        }
        return res.redirect('/');
    },

    // Check if project subscriber is approved and subscribed
    isProjectSubscriberActive: async (req, res, next) => {
        try {
            const User = require('../models/User');
            const user = await User.findById(req.session.userId);
            if (user.userType === 'project_subscriber' && 
                user.projectSubscriberProfile.isApproved && 
                user.projectSubscriberProfile.subscriptionStatus === 'active') {
                return next();
            }
            req.flash('error', 'Please activate your subscription and complete bank guarantee verification to access this area.');
            res.redirect('/project-subscriber/subscription');
        } catch (error) {
            next(error);
        }
    },

    // Check if user is a REVAAMP Partner Solicitor
    isSolicitor: (req, res, next) => {
        if (req.session.userType === 'solicitor') {
            return next();
        }
        req.flash('error', 'Access denied. Partner Solicitor only area.');
        if (req.path !== '/dashboard') {
            return res.redirect('/dashboard');
        }
        return res.redirect('/');
    },

    // Check if user is a Hectare by Hectare Solicitor
    isHectareSolicitor: (req, res, next) => {
        if (req.session.userType === 'hectare_solicitor') {
            return next();
        }
        req.flash('error', 'Access denied. Hectare by Hectare Solicitor only area.');
        if (req.path !== '/dashboard') {
            return res.redirect('/dashboard');
        }
        return res.redirect('/');
    },

    // Check if solicitor is active (approved)
    isSolicitorActive: async (req, res, next) => {
        try {
            const Solicitor = require('../models/Solicitor');
            const user = await Solicitor.findById(req.session.userId);
            if (user && user.userType === 'solicitor' && user.partnerProfile && user.partnerProfile.isActive) {
                return next();
            }
            req.flash('error', 'Your solicitor account is pending approval.');
            res.redirect('/solicitor/pending');
        } catch (error) {
            next(error);
        }
    },

    // Check if hectare solicitor is active
    isHectareSolicitorActive: async (req, res, next) => {
        try {
            const HectareSolicitor = require('../models/HectareSolicitor');
            const user = await HectareSolicitor.findById(req.session.userId);
            if (user && user.userType === 'hectare_solicitor' && user.hectareProfile && user.hectareProfile.isActive) {
                return next();
            }
            req.flash('error', 'Your Hectare by Hectare solicitor account is pending approval.');
            res.redirect('/hectare-solicitor/pending');
        } catch (error) {
            next(error);
        }
    }
};

module.exports = authMiddleware;