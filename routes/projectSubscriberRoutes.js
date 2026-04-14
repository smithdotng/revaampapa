// routes/projectSubscriberRoutes.js
const express = require('express');
const router = express.Router();
const projectSubscriberController = require('../controllers/projectSubscriberController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication and project_subscriber role
router.use(authMiddleware.isAuthenticated);
router.use(authMiddleware.isProjectSubscriber);

// Dashboard
router.get('/dashboard', projectSubscriberController.getDashboard);
router.get('/', projectSubscriberController.getDashboard);

// Project Management
router.get('/projects', projectSubscriberController.getProjects);
router.get('/projects/create', projectSubscriberController.getCreateProject);
router.post('/projects/create', upload.uploadBankGuaranteeDoc, projectSubscriberController.postCreateProject);
router.get('/projects/:slug', projectSubscriberController.getProjectDetails);
router.get('/projects/:slug/updates', projectSubscriberController.getProjectUpdates);
router.get('/projects/:slug/financials', projectSubscriberController.getProjectFinancials);

// Bank Guarantee
router.get('/bank-guarantee', projectSubscriberController.getBankGuarantee);
router.post('/bank-guarantee', upload.uploadBankGuaranteeDoc, projectSubscriberController.postBankGuarantee);

// Subscription
router.get('/subscription', projectSubscriberController.getSubscription);
router.post('/subscription', projectSubscriberController.postSubscription);
router.get('/subscription-callback', projectSubscriberController.subscriptionCallback);

// Settings
router.get('/settings', projectSubscriberController.getSettings);
router.post('/update-profile', projectSubscriberController.updateProfile);
router.post('/change-password', projectSubscriberController.changePassword);

module.exports = router;