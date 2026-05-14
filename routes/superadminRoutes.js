// routes/superadminRoutes.js
const express = require('express');
const router = express.Router();
const superadminController = require('../controllers/superadminController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');  // ADD THIS LINE

// All routes require superadmin authentication
router.use(authMiddleware.isAuthenticated);
router.use(authMiddleware.isSuperadmin);

// Dashboard
router.get('/dashboard', superadminController.getDashboard);
router.get('/', superadminController.getDashboard);

// ============= PROPERTY MANAGEMENT =============
router.get('/properties', superadminController.getProperties);
router.get('/properties/pending', superadminController.getPendingProperties);
router.get('/properties/:id', superadminController.getPropertyDetails);
router.post('/properties/:id/confirm-payment', superadminController.confirmPayment);
router.post('/properties/:id/verify', superadminController.verifyProperty);
router.post('/properties/:id/reject', superadminController.rejectProperty);
router.post('/properties/:id/feature', superadminController.featureProperty);
router.delete('/properties/:id', superadminController.deleteProperty);
// Add these routes to your superadminRoutes.js
router.get('/properties/:id/edit', superadminController.getEditProperty);
router.put('/properties/:id/edit', upload.uploadMultiple, superadminController.updateProperty);
// ============= PROMOTER MANAGEMENT =============
router.get('/promoters', superadminController.getPromoters);
router.get('/promoters/pending', superadminController.getPendingPromoters);
router.post('/promoters/:id/approve', superadminController.approvePromoter);
router.post('/promoters/:id/reject', superadminController.rejectPromoter);
router.post('/promoters/:id/suspend', superadminController.suspendPromoter);
router.get('/promoters/:id/transactions', superadminController.getPromoterTransactions);

// ============= PROPERTY OWNER MANAGEMENT =============
router.get('/property-owners', superadminController.getPropertyOwners);
router.get('/property-owners/:id', superadminController.getPropertyOwnerDetails);

// ============= TRANSACTION MANAGEMENT =============
router.get('/transactions', superadminController.getTransactions);
router.get('/transactions/:id', superadminController.getTransactionDetails);

// ============= WITHDRAWAL MANAGEMENT =============
router.get('/withdrawals', superadminController.getWithdrawals);
router.post('/withdrawals/:id/process', superadminController.processWithdrawal);
router.post('/withdrawals/:id/reject', superadminController.rejectWithdrawal);

// ============= ANALYTICS =============
router.get('/analytics', superadminController.getAnalytics);
router.get('/api/revenue-data', superadminController.getRevenueData);
router.get('/api/property-distribution', superadminController.getPropertyDistribution);

// ============= SETTINGS =============
router.get('/settings', superadminController.getSettings);
router.post('/settings', superadminController.updateSettings);

// ============= PROFILE =============
router.get('/profile', superadminController.getProfile);
router.post('/update-profile', superadminController.updateProfile);
router.post('/change-password', superadminController.changePassword);

// ============= PAYMENT VERIFICATION =============
router.get('/payments/pending', superadminController.getPendingPayments);
router.post('/payments/verify/:id', superadminController.verifyPayment);
router.post('/payments/reject/:id', superadminController.rejectPayment);

// ============= HOTEL MANAGEMENT =============
router.get('/hotels', superadminController.getAllHotels);
router.get('/hotels/add', superadminController.getAddHotel);
router.post('/hotels/add', upload.uploadMultiple, superadminController.postAddHotel);
router.get('/hotels/:id/edit', superadminController.getEditHotel);
router.post('/hotels/:id/edit', upload.uploadMultiple, superadminController.updateHotel);
router.delete('/hotels/:id', superadminController.deleteHotel);
router.post('/hotels/:id/toggle-status', superadminController.toggleHotelStatus);
router.post('/hotels/:id/toggle-featured', superadminController.toggleHotelFeatured);

module.exports = router;