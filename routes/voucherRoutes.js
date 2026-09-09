// routes/voucherRoutes.js
// Revaamp Room Voucher Subscription + hotel reservation module.
const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const authMiddleware = require('../middleware/auth');

// ============= PUBLIC =============
// Promoters and business partners already share /voucher/register?ref=<id>
// links from their dashboards — this is the page those land on.
router.get('/register', voucherController.getRegister);
router.post('/register', voucherController.postRegister);

// "Are you a Room Voucher Subscriber?" check from the hotels listing page
router.post('/check', voucherController.postCheckSubscriber);
router.post('/exit', voucherController.postExitVoucherMode);

// ============= RESERVATION MODULE =============
// Open to a subscriber identified either by login or by the check above, since
// registering interest is what makes the cashback claimable.
router.get('/reserve/:slug', voucherController.getReserve);
router.post('/reserve/:slug', voucherController.postReserve);

// ============= SUBSCRIBER AREA =============
router.get('/dashboard',
    authMiddleware.isAuthenticated,
    authMiddleware.isVoucherSubscriber,
    voucherController.getDashboard
);

router.get('/reservations',
    authMiddleware.isAuthenticated,
    authMiddleware.isVoucherSubscriber,
    voucherController.getReservations
);

router.get('/reservations/:id',
    authMiddleware.isAuthenticated,
    authMiddleware.isVoucherSubscriber,
    voucherController.getReservationDetail
);

router.post('/reservations/:id/cancel',
    authMiddleware.isAuthenticated,
    authMiddleware.isVoucherSubscriber,
    voucherController.postCancelReservation
);

router.get('/settings',
    authMiddleware.isAuthenticated,
    authMiddleware.isVoucherSubscriber,
    voucherController.getSettings
);

router.post('/settings',
    authMiddleware.isAuthenticated,
    authMiddleware.isVoucherSubscriber,
    voucherController.postSettings
);

router.post('/change-password',
    authMiddleware.isAuthenticated,
    authMiddleware.isVoucherSubscriber,
    voucherController.postChangePassword
);

module.exports = router;
