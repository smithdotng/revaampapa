// routes/shortletRoutes.js
const express = require('express');
const router = express.Router();
const shortletController = require('../controllers/shortletController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/:id/availability', shortletController.getAvailability);
router.get('/:id/check', shortletController.checkAvailability);
router.post('/:id/book', shortletController.createBooking);

// Booking management
router.get('/bookings/:reference', shortletController.getBooking);
router.post('/bookings/:reference/cancel', shortletController.cancelBooking);

// Owner routes (protected)
router.post('/:id/settings', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isRealtor,
    shortletController.updateShortletSettings
);

router.post('/:id/block-dates',
    authMiddleware.isAuthenticated,
    authMiddleware.isRealtor,
    shortletController.blockDates
);

router.get('/:id/bookings',
    authMiddleware.isAuthenticated,
    authMiddleware.isRealtor,
    shortletController.getPropertyBookings
);

module.exports = router;