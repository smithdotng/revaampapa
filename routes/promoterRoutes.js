// routes/promoterRoutes.js
const express = require('express');
const router = express.Router();
const promoterController = require('../controllers/promoterController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const promoterHotelController = require('../controllers/promoterHotelController');

// All routes require authentication and promoter role
router.use(authMiddleware.isAuthenticated);
router.use(authMiddleware.isPromoter);

// Dashboard
router.get('/dashboard', promoterController.getDashboard);
router.get('/', promoterController.getDashboard);

// Generate referral link API
router.get('/api/generate-referral-link', promoterController.generateReferralLink);

// Share Analytics
router.get('/share-analytics', promoterController.getShareAnalyticsPage);
router.get('/api/share-analytics', promoterController.getShareAnalytics);
router.post('/api/track-share', promoterController.trackShare);

// Property Introduction
router.get('/submit-property', promoterController.getSubmitPropertyPage);
router.post('/submit-property', upload.uploadMultiple, promoterController.submitProperty);

// Buyer Introduction
router.get('/submit-buyer', promoterController.getSubmitBuyerPage);
router.post('/submit-buyer', promoterController.submitBuyer);

// Hotel Onboarding
router.get('/onboard-hotel', promoterController.getOnboardHotelPage);
router.post('/onboard-hotel', upload.uploadMultiple, promoterController.onboardHotel);

// Promotions
router.get('/promotions', promoterController.getPromotionsPage);
router.post('/promotion/:propertyId', promoterController.createPromotion);

// API Routes
router.get('/api/promotions', promoterController.getPromoterPromotions);
router.post('/api/promotion/:propertyId', promoterController.createPromotionAPI);
router.get('/api/stats', promoterController.getPromoterStatsAPI);
router.get('/api/earnings-data', promoterController.getEarningsDataAPI);
router.get('/api/interests', promoterController.getInterestsAPI);
router.get('/api/referral-stats', promoterController.getReferralStatsAPI);

// Clicks, Referrals & Conversions API Routes
router.get('/api/clicks', promoterController.getClicks);
router.get('/api/referrals', promoterController.getReferrals);
router.get('/api/conversions', promoterController.getConversions);
router.post('/api/track-click', promoterController.trackClick);

// Referral Links API
router.get('/api/voucher-link', promoterController.getVoucherLink);
router.get('/api/business-partner-link', promoterController.getBusinessPartnerLink);
router.get('/api/aggregator-link', promoterController.getAggregatorLink);
router.get('/api/promoter-referral-link', promoterController.getPromoterReferralLink);
router.get('/api/generate-referral-link', promoterController.generateReferralLink);
// Earnings
router.get('/earnings', promoterController.getEarningsPage);
router.post('/withdraw', promoterController.requestWithdrawal);

// Analytics
router.get('/analytics', promoterController.getAnalyticsPage);

// Hotel promotion routes (make sure promoterHotelController exists)
router.get('/hotels', promoterHotelController.getPromoterHotels);
router.get('/hotels/:id', promoterHotelController.getHotelDetail);
router.post('/hotels/track-share', promoterHotelController.trackShare);

// Settings
router.get('/settings', promoterController.getSettingsPage);
router.post('/update-profile', promoterController.updateProfile);
router.post('/update-bank', promoterController.updateBankDetails);
router.post('/change-password', promoterController.changePassword);

module.exports = router;