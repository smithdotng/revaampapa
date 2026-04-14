// routes/inquiryRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Public route - Create inquiry
router.post('/project', (req, res) => {
    req.flash('success', 'Inquiry sent successfully');
    res.redirect('back');
});

// Admin routes (protected)
router.get('/admin/inquiries', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAdmin, 
    (req, res) => {
        res.render('admin/inquiries', { 
            title: 'Inquiries - RevaampAPA', 
            user: req.session.user 
        });
    }
);

router.get('/admin/inquiries/:id', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAdmin, 
    (req, res) => {
        res.render('admin/inquiry-detail', { 
            title: 'Inquiry Details - RevaampAPA', 
            user: req.session.user 
        });
    }
);

router.post('/admin/inquiries/:id/reply', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAdmin, 
    (req, res) => {
        req.flash('success', 'Reply sent');
        res.redirect(`/admin/inquiries/${req.params.id}`);
    }
);

router.delete('/admin/inquiries/:id', 
    authMiddleware.isAuthenticated, 
    authMiddleware.isAdmin, 
    (req, res) => {
        res.json({ success: true });
    }
);

module.exports = router;