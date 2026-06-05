// routes/propertyOwnerRoutes.js
const express = require('express');
const router = express.Router();
const propertyOwnerController = require('../controllers/propertyOwnerController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication and property_owner role
router.use(authMiddleware.isAuthenticated);
router.use(authMiddleware.isPropertyOwner);

// Dashboard
router.get('/dashboard', propertyOwnerController.getDashboard);
router.get('/', propertyOwnerController.getDashboard);

// Property management
router.get('/properties/add', propertyOwnerController.getAddProperty);
router.post('/properties/add', upload.uploadMultiple, propertyOwnerController.postAddProperty);
router.get('/properties/:id/edit', propertyOwnerController.getEditProperty);
router.put('/properties/:id', upload.uploadMultiple, propertyOwnerController.updateProperty);
router.delete('/properties/:id', propertyOwnerController.deleteProperty);
router.get('/properties/:id', propertyOwnerController.getPropertyDetails);

// Verification payment - Fixed: using uploadPaymentProofDoc
router.get('/properties/pay-verification/:id', propertyOwnerController.getPayVerification);
router.post('/properties/pay-verification/:id', upload.uploadPaymentProofDoc, propertyOwnerController.processVerificationPayment);

// Earnings
router.get('/earnings', propertyOwnerController.getEarnings);

// Settings
router.get('/settings', propertyOwnerController.getSettings);
router.post('/update-profile', propertyOwnerController.updateProfile);
router.post('/change-password', propertyOwnerController.changePassword);

module.exports = router;