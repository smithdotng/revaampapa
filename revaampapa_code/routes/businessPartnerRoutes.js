// routes/businessPartnerRoutes.js
const express = require('express');
const router = express.Router();
const businessPartnerController = require('../controllers/businessPartnerController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication and business partner role
router.use(authMiddleware.isAuthenticated);
router.use(authMiddleware.isBusinessPartner);

// Dashboard
router.get('/dashboard', businessPartnerController.getDashboard);
router.get('/', businessPartnerController.getDashboard);

// Earnings
router.get('/earnings', businessPartnerController.getEarnings);

// Settings
router.get('/settings', (req, res) => {
    res.render('business-partner/settings', {
        title: 'Settings - RevaampAP',
        user: req.currentUser || { name: req.session.userName },
        currentPath: '/business-partner/settings'
    });
});

// API Routes
router.get('/api/generate-referral-link', businessPartnerController.generateReferralLink);
router.post('/api/track-share', businessPartnerController.trackShare);

// Profile update
router.post('/update-profile', async (req, res) => {
    try {
        const User = require('../models/User');
        const { name, phone } = req.body;
        await User.findByIdAndUpdate(req.session.userId, { name, phone });
        req.flash('success', 'Profile updated successfully');
        res.redirect('/business-partner/settings');
    } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/business-partner/settings');
    }
});

module.exports = router;