// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// ============= LOGIN ROUTES =============
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

// ============= PROPERTY OWNER REGISTRATION =============
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);

// ============= PROMOTER REGISTRATION (FREE) =============
router.get('/promoter/register', authController.getPromoterRegister);
router.post('/promoter/register', authController.postPromoterRegister);

// ============= BUSINESS PARTNER REGISTRATION =============
router.get('/business-partner/register', authController.getBusinessPartnerRegister);
router.post('/business-partner/register', upload.uploadPaymentProofDoc, authController.postBusinessPartnerRegister);

// ============= PROJECT SUBSCRIBER REGISTRATION =============
router.get('/project-subscriber/register', authController.getProjectSubscriberRegister);
router.post('/project-subscriber/register', authController.postProjectSubscriberRegister);

// ============= DASHBOARD =============
router.get('/dashboard', authMiddleware.isAuthenticated, authController.getDashboard);

// ============= PROFILE MANAGEMENT =============
router.post('/dashboard/update-profile', authMiddleware.isAuthenticated, authController.updateProfile);
router.post('/dashboard/update-profile-image', authMiddleware.isAuthenticated, upload.upload.single('profileImage'), authController.updateProfileImage);
router.post('/dashboard/change-password', authMiddleware.isAuthenticated, authController.changePassword);

// ============= PASSWORD RESET =============
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);
router.get('/reset-password/:token', authController.getResetPassword);
router.post('/reset-password/:token', authController.postResetPassword);

// ============= VERIFICATION CALLBACK =============
router.get('/verification-callback', authController.verificationCallback);

// ============= LOGOUT =============
router.get('/logout', authController.logout);

// ============= PENDING PAGE =============
router.get('/agent/pending', authController.agentPending);

module.exports = router;