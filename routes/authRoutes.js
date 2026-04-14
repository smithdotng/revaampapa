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
router.post('/register', upload.uploadPaymentProof.single('paymentProof'), authController.postRegister);


// ============= PROMOTER REGISTRATION =============
router.get('/promoter/register', authController.getPromoterRegister);
router.post('/promoter/register', authController.postPromoterRegister);
router.get('/agent/pending', authController.agentPending);

// Business Partner registration (with payment)
router.get('/business-partner/register', authController.getBusinessPartnerRegister);
router.post('/business-partner/register', upload.uploadPaymentProof.single('paymentProof'), authController.postBusinessPartnerRegister);

// ============= DASHBOARD =============
router.get('/dashboard', authMiddleware.isAuthenticated, authController.getDashboard);

// ============= PROFILE MANAGEMENT =============
router.post('/dashboard/update-profile', 
    authMiddleware.isAuthenticated, 
    authController.updateProfile
);

router.post('/dashboard/update-profile-image', 
    authMiddleware.isAuthenticated, 
    (req, res, next) => {
        upload.upload.single('profileImage')(req, res, (err) => {
            if (err) {
                console.error('Upload error:', err);
                req.flash('error', err.message);
                return res.redirect('/dashboard/settings');
            }
            next();
        });
    },
    authController.updateProfileImage
);

router.post('/dashboard/change-password', 
    authMiddleware.isAuthenticated, 
    authController.changePassword
);

// ============ Project Subscriber registration ==========
router.get('/project-subscriber/register', authController.getProjectSubscriberRegister);
router.post('/project-subscriber/register', authController.postProjectSubscriberRegister);



// ============= PASSWORD RESET =============
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);
router.get('/reset-password/:token', authController.getResetPassword);
router.post('/reset-password/:token', authController.postResetPassword);

// ============= VERIFICATION CALLBACK =============
router.get('/verification-callback', authController.verificationCallback);

// ============= LOGOUT =============
router.get('/logout', authController.logout);

module.exports = router;