// routes/partnerHotelRoutes.js
const express = require('express');
const router = express.Router();
const partnerHotelController = require('../controllers/partnerHotelController');
const { uploadPartnerHotelDocs } = require('../middleware/upload');

// ============= PUBLIC ROUTES =============
// Revaamp Partner Hotel registration.
//
// Partner hotels deliberately have NO dashboard and no account area. Their only
// touchpoint after applying is the approval email sent from
// superadminController.approvePartnerHotel. Login is blocked for this user type
// in authController.postLogin. Do not add protected routes here.
router.get('/register', partnerHotelController.getRegister);
router.post('/register', uploadPartnerHotelDocs, partnerHotelController.postRegister);

module.exports = router;
