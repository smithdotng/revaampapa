// routes/propertyRoutes.js
const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes (no authentication required)
router.get('/', propertyController.getAllProperties);
router.get('/:slug', propertyController.getPropertyDetail);

// Protected routes (require authentication)
router.get('/add/new', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isPropertyOwner,
    propertyController.getAddProperty
);

router.post('/add', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isPropertyOwner,
    upload.uploadMultiple,
    propertyController.postAddProperty
);

router.get('/:id/edit', 
    authMiddleware.isAuthenticated,
    propertyController.getEditProperty
);

router.put('/:id', 
    authMiddleware.isAuthenticated,
    upload.uploadMultiple,
    propertyController.updateProperty
);

router.delete('/:id', 
    authMiddleware.isAuthenticated,
    propertyController.deleteProperty
);

// API routes
router.get('/api/inquiries', authMiddleware.isAuthenticated, propertyController.getInquiries);
router.get('/api/transactions', authMiddleware.isAuthenticated, propertyController.getTransactions);
router.get('/api/earnings', authMiddleware.isAuthenticated, propertyController.getEarnings);
router.get('/api/analytics', authMiddleware.isAuthenticated, propertyController.getAnalytics);

module.exports = router;