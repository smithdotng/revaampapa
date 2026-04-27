// routes/solicitorRoutes.js
const express = require('express');
const router = express.Router();
const solicitorController = require('../controllers/solicitorController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// ============= PUBLIC ROUTES =============

// REVAAMP Partner Solicitor Registration
router.get('/register', solicitorController.getSolicitorRegister);
router.post('/register', upload.uploadSolicitorDocs, solicitorController.postSolicitorRegister);

// Hectare by Hectare Solicitor Registration
router.get('/hectare/register', solicitorController.getHectareSolicitorRegister);
router.post('/hectare/register', upload.uploadHectareSolicitorDocs, solicitorController.postHectareSolicitorRegister);

// ============= PROTECTED ROUTES =============

// REVAAMP Partner Solicitor Dashboard
router.get('/dashboard', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isSolicitor,
    solicitorController.getDashboard
);

// Hectare by Hectare Solicitor Dashboard
router.get('/hectare/dashboard', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isHectareSolicitor,
    solicitorController.getHectareDashboard
);

// ============= API ROUTES =============
router.get('/api/stats', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isSolicitor,
    solicitorController.getSolicitorStats
);

router.post('/api/kpis', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isSolicitor,
    solicitorController.updateKPIs
);

module.exports = router;