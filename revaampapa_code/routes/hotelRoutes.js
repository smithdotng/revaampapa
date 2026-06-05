const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// ============= PUBLIC ROUTES =============
router.get('/', hotelController.getHotels);
router.get('/:slug', hotelController.getHotelDetail);
router.get('/track/:hotelId/:code', hotelController.trackHotelClick);

// ============= SUPERADMIN ROUTES =============
router.get('/superadmin/hotels', authMiddleware.isAuthenticated, authMiddleware.isSuperadmin, hotelController.getAllHotels);
router.get('/superadmin/hotels/add', authMiddleware.isAuthenticated, authMiddleware.isSuperadmin, hotelController.getAddHotel);
router.post('/superadmin/hotels/add', authMiddleware.isAuthenticated, authMiddleware.isSuperadmin, upload.uploadMultiple, hotelController.postAddHotel);
router.get('/superadmin/hotels/:id/edit', authMiddleware.isAuthenticated, authMiddleware.isSuperadmin, hotelController.getEditHotel);
router.post('/superadmin/hotels/:id/edit', authMiddleware.isAuthenticated, authMiddleware.isSuperadmin, upload.uploadMultiple, hotelController.updateHotel);
router.delete('/superadmin/hotels/:id', authMiddleware.isAuthenticated, authMiddleware.isSuperadmin, hotelController.deleteHotel);
router.post('/superadmin/hotels/:id/toggle-status', authMiddleware.isAuthenticated, authMiddleware.isSuperadmin, hotelController.toggleHotelStatus);
router.post('/superadmin/hotels/:id/toggle-featured', authMiddleware.isAuthenticated, authMiddleware.isSuperadmin, hotelController.toggleFeatured);

// ============= PROMOTER ROUTES =============
router.get('/promoter/hotels/stats', authMiddleware.isAuthenticated, authMiddleware.isPromoter, hotelController.getPromoterHotelStats);

// ============= BUSINESS PARTNER ROUTES =============
router.get('/business-partner/hotels/stats', authMiddleware.isAuthenticated, authMiddleware.isBusinessPartner, hotelController.getBusinessPartnerHotelStats);

// Add this to your existing hotelRoutes.js
router.get('/track/:hotelId/:code', async (req, res) => {
    try {
        const { hotelId, code } = req.params;
        const Hotel = require('../models/Hotel');
        const HotelClick = require('../models/HotelClick');
        
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) {
            return res.status(404).send('Hotel not found');
        }
        
        // Find who owns this unique code
        let promoter = null;
        let businessPartner = null;
        let userType = 'anonymous';
        
        const user = await User.findOne({ 'promoterProfile.uniqueLinks.code': code });
        if (user && user.userType === 'promoter') {
            promoter = user._id;
            userType = 'promoter';
        } else {
            const businessUser = await User.findOne({ 'businessPartnerProfile.uniqueLinks.code': code });
            if (businessUser && businessUser.userType === 'business_partner') {
                businessPartner = businessUser._id;
                userType = 'business_partner';
            }
        }
        
        // Record the click
        const click = new HotelClick({
            hotel: hotelId,
            promoter: promoter,
            businessPartner: businessPartner,
            userType: userType,
            uniqueLinkCode: code,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            referrer: req.headers.referer,
            clickedAt: new Date()
        });
        
        await click.save();
        
        // Update hotel total clicks
        hotel.totalClicks = (hotel.totalClicks || 0) + 1;
        await hotel.save();
        
        // Store click ID in session for conversion tracking
        req.session.hotelClickId = click._id;
        
        // Redirect to hotel detail page
        res.redirect(`/hotels/${hotel.slug}?ref=${code}`);
    } catch (error) {
        console.error('Track hotel click error:', error);
        res.status(500).send('Error tracking click');
    }
});

module.exports = router;