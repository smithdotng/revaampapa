// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const blogController = require('../controllers/blogController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// All admin routes are protected and require admin privileges
router.use(authMiddleware.isAuthenticated, authMiddleware.isAdmin);

// Admin dashboard
router.get('/dashboard', adminController.getDashboard);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);
router.post('/users/:id/verify', adminController.verifyUser);
router.post('/users/:id/suspend', adminController.suspendUser);
router.delete('/users/:id', adminController.deleteUser);

// Agent management
router.get('/agents', adminController.getAgents);
router.get('/agents/pending', adminController.getPendingAgents);
router.get('/agents/:id', adminController.getAgentDetails);
router.post('/agents/:id/approve', adminController.approveAgent);
router.post('/agents/:id/reject', adminController.rejectAgent);
router.post('/agents/:id/suspend', adminController.suspendAgent);
router.delete('/agents/:id', adminController.deleteAgent);
router.get('/agents/:id/transactions', adminController.getAgentTransactions);

// Property management
router.get('/properties', adminController.getProperties);
router.get('/properties/pending', adminController.getPendingProperties);
router.get('/properties/:id', adminController.getPropertyDetails);
router.post('/properties/:id/approve', adminController.approveProperty);
router.post('/properties/:id/reject', adminController.rejectProperty);
router.post('/properties/:id/feature', adminController.featureProperty);
router.delete('/properties/:id', adminController.deleteProperty);

// Featured properties (special arrangements)
router.get('/featured', adminController.getFeaturedProperties);
router.get('/featured/add', adminController.getAddFeaturedProperty);
router.post('/featured/add', adminController.addFeaturedProperty);
router.get('/featured/:id/edit', adminController.getEditFeaturedProperty);
router.post('/featured/:id/edit', adminController.editFeaturedProperty);
router.delete('/featured/:id', adminController.deleteFeaturedProperty);

// Blog Management Routes
router.get('/blogs', blogController.adminGetAllBlogs);
router.get('/blogs/create', blogController.getCreateBlog);
router.post('/blogs/create', 
    upload.upload.single('featuredImage'), 
    blogController.createBlog
);
router.get('/blogs/:id/edit', blogController.getEditBlog);
router.put('/blogs/:id', 
    upload.upload.single('featuredImage'), 
    blogController.updateBlog
);
router.delete('/blogs/:id', blogController.deleteBlog);

// Transactions
router.get('/transactions', adminController.getTransactions);
router.get('/transactions/:id', adminController.getTransactionDetails);

// Withdrawal requests
router.get('/withdrawals', adminController.getWithdrawals);

// Platform settings
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);

// Analytics and reports
router.get('/analytics', adminController.getAnalytics);

// API routes for charts
router.get('/api/revenue-data', adminController.getRevenueData);
router.get('/api/property-distribution', adminController.getPropertyDistribution);
router.get('/api/content-distribution', adminController.getContentDistribution);

// Add to adminRoutes.js
const projectController = require('../controllers/projectController');

// Project management routes
router.get('/projects', projectController.adminGetAllProjects);
router.get('/projects/create', projectController.getCreateProject);
router.post('/projects/create', upload.upload.single('featuredImage'), projectController.createProject);
router.get('/projects/:id/edit', projectController.getEditProject);
router.put('/projects/:id', upload.upload.single('featuredImage'), projectController.updateProject);
router.delete('/projects/:id', projectController.deleteProject);

// Profile routes
router.get('/profile', adminController.getProfile);
router.post('/update-profile', adminController.updateProfile);
router.post('/update-profile-image', adminController.updateProfileImage);
router.post('/remove-profile-image', adminController.removeProfileImage);
router.post('/change-password', adminController.changePassword);

module.exports = router;