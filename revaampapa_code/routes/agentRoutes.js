// routes/agentRoutes.js
const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const authMiddleware = require('../middleware/auth');

// ============= PAGE ROUTES =============

// Agent dashboard (protected route)
router.get('/dashboard', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    authMiddleware.isAgentApproved,
    agentController.getDashboard
);

// Get agent's referral link page
router.get('/referral-link', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.getReferralLinkPage
);

// Get agent's earnings page
router.get('/earnings', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.getEarningsPage
);

// Get properties available for promotion (page)
router.get('/available-properties', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.getAvailablePropertiesPage
);

// Get agent's promoted properties page
router.get('/promotions', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.getPromotionsPage
);

// Get analytics page
router.get('/analytics', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.getAnalyticsPage
);

// Get settings page
router.get('/settings', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.getSettingsPage
);

// ============= API ROUTES =============
// These must be BEFORE the page routes to avoid conflicts

// API: Get all promotions for the agent
router.get('/api/promotions', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.getAgentPromotions
);

// API: Get promotion stats
router.get('/api/promotion/:id/stats', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.getPromotionStats
);

// API: Track social share
router.post('/api/promotion/:id/share/:platform', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.trackSocialShare
);

// API: Create promotion for a property
router.post('/api/promotion/:propertyId', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.createPromotionAPI
);

// API: Generate QR code for promotion
router.get('/api/promotion/:id/qrcode', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.generateQRCodeAPI
);

// API: Download QR code
router.get('/api/promotion/:id/qrcode/download', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.downloadQRCodeAPI
);

// API: Get agent stats
router.get('/api/stats', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.getAgentStatsAPI
);

// API: Get earnings data
router.get('/api/earnings-data', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.getEarningsDataAPI
);

// ============= POST ROUTES =============

// Withdrawal request
router.post('/withdraw', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.requestWithdrawal
);

// Update bank details
router.post('/update-bank', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.updateBankDetails
);

// Update profile
router.post('/update-profile', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.updateProfile
);

// Change password
router.post('/change-password', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.changePassword
);

// Track click on referral link
router.get('/track/:propertyId', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.trackClick
);

// Create promotion (alternate endpoint)
router.post('/promotion/:propertyId', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAgent,
    agentController.createPromotion
);

module.exports = router;