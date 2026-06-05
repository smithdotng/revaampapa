// routes/inquiryRoutes.js
const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const authMiddleware = require('../middleware/auth');

// ============= PUBLIC ROUTES (MUST BE FIRST) =============
// This route needs to be accessible without authentication
router.post('/api/inquiries', inquiryController.submitInquiry);

// ============= PROPERTY OWNER ROUTES =============
router.get('/property-owner/inquiries', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isPropertyOwner,
    inquiryController.getOwnerInquiries
);

router.get('/property-owner/inquiries/:id', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isPropertyOwner,
    inquiryController.getInquiryDetails
);

router.post('/property-owner/inquiries/:id/reply', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isPropertyOwner,
    inquiryController.replyToInquiry
);

router.post('/property-owner/inquiries/:id/note', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isPropertyOwner,
    inquiryController.addNote
);

router.put('/property-owner/inquiries/:id/status', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isPropertyOwner,
    inquiryController.updateStatus
);

// ============= SUPERADMIN ROUTES =============
router.get('/superadmin/inquiries', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isSuperadmin,
    inquiryController.getAllInquiries
);

router.get('/superadmin/inquiries/:id', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isSuperadmin,
    inquiryController.getAdminInquiryDetails
);

router.delete('/superadmin/inquiries/:id', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isSuperadmin,
    inquiryController.deleteInquiry
);

router.post('/superadmin/inquiries/bulk-update', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isSuperadmin,
    inquiryController.bulkUpdateStatus
);

router.get('/superadmin/inquiries/export/csv', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isSuperadmin,
    inquiryController.exportInquiries
);

module.exports = router;