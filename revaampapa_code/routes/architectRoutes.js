// routes/architectRoutes.js
const express = require('express');
const router = express.Router();
const architectController = require('../controllers/architectController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// ============= PUBLIC ROUTES =============

// REVAAMP Partner Architect Registration
router.get('/register', architectController.getArchitectRegister);
router.post('/register', upload.uploadArchitectDocs, architectController.postArchitectRegister);

// ============= PROTECTED ROUTES =============

// Architect Dashboard
router.get('/dashboard',
    authMiddleware.isAuthenticated,
    authMiddleware.isArchitect,
    architectController.getDashboard
);

// Structural Assessment Report
router.get('/assessment/new',
    authMiddleware.isAuthenticated,
    authMiddleware.isArchitect,
    architectController.getNewAssessment
);

router.post('/assessment/new',
    authMiddleware.isAuthenticated,
    authMiddleware.isArchitect,
    upload.uploadStructuralAssessmentDocs,
    architectController.postNewAssessment
);

router.get('/assessment/:id',
    authMiddleware.isAuthenticated,
    authMiddleware.isArchitect,
    architectController.getAssessmentDetail
);

module.exports = router;
