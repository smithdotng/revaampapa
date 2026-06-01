const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const authMiddleware = require('../middleware/auth');

// QR code generation routes (require authentication)
router.get('/api/qr/promoter', authMiddleware.isAuthenticated, qrController.generatePromoterQR);
router.get('/api/qr/business-partner', authMiddleware.isAuthenticated, qrController.generateBusinessPartnerQR);
router.get('/api/qr/agent', authMiddleware.isAuthenticated, qrController.generateAgentQR);
router.get('/api/qr/solicitor', authMiddleware.isAuthenticated, qrController.generateSolicitorQR);
router.get('/api/qr/hectare-solicitor', authMiddleware.isAuthenticated, qrController.generateHectareSolicitorQR);
router.get('/api/qr/property-owner', authMiddleware.isAuthenticated, qrController.generatePropertyOwnerQR);
router.get('/api/qr/project-subscriber', authMiddleware.isAuthenticated, qrController.generateProjectSubscriberQR);
router.get('/api/qr/property/:propertyId', authMiddleware.isAuthenticated, qrController.generatePropertyQR);
router.get('/api/qr/hotel/:hotelId', authMiddleware.isAuthenticated, qrController.generateHotelQR);
router.get('/api/qr/all', authMiddleware.isAuthenticated, qrController.getAllQRCodes);
router.post('/api/qr/download', authMiddleware.isAuthenticated, qrController.downloadQR);

module.exports = router;