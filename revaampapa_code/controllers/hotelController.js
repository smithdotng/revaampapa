const Hotel = require('../models/Hotel');
const HotelClick = require('../models/HotelClick');
const HotelBooking = require('../models/HotelBooking');
const User = require('../models/User');
const crypto = require('crypto');

// ============= SUPERADMIN HOTEL MANAGEMENT =============

// Get all hotels (Superadmin)
exports.getAllHotels = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { status, featured, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (status === 'active') query.isActive = true;
        if (status === 'inactive') query.isActive = false;
        if (featured === 'true') query.featured = true;
        
        const hotels = await Hotel.find(query)
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await Hotel.countDocuments(query);
        
        const stats = {
            total: await Hotel.countDocuments(),
            active: await Hotel.countDocuments({ isActive: true }),
            inactive: await Hotel.countDocuments({ isActive: false }),
            featured: await Hotel.countDocuments({ featured: true })
        };
        
        res.render('superadmin/hotels', {
            title: 'Hotel Management - RevaampAP',
            user: user,
            hotels: hotels,
            stats: stats,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total: total,
            filters: req.query,
            currentPath: '/superadmin/hotels'
        });
    } catch (error) {
        console.error('Get hotels error:', error);
        req.flash('error', 'Error loading hotels');
        res.redirect('/superadmin/dashboard');
    }
};

// Get add hotel form
exports.getAddHotel = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('superadmin/add-hotel', {
            title: 'Add New Hotel - RevaampAP',
            user: user,
            hotel: null,
            currentPath: '/superadmin/hotels/add'
        });
    } catch (error) {
        console.error('Get add hotel error:', error);
        req.flash('error', 'Error loading form');
        res.redirect('/superadmin/hotels');
    }
};

// Post add hotel
exports.postAddHotel = async (req, res) => {
    try {
        const {
            name, description, address, city, state, country,
            phone, email, website, commissionRate,
            amenities, featured, rating
        } = req.body;
        
        const images = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                images.push({
                    url: '/uploads/hotels/' + file.filename,
                    isPrimary: index === 0
                });
            });
        }
        
        const hotel = new Hotel({
            name: name.trim(),
            description,
            location: { address, city, state, country },
            images,
            contactInfo: { phone, email, website },
            commissionRate: parseFloat(commissionRate) || 30,
            amenities: amenities ? (Array.isArray(amenities) ? amenities : [amenities]) : [],
            featured: featured === 'on',
            rating: parseFloat(rating) || 0,
            createdBy: req.session.userId
        });
        
        await hotel.save();
        
        req.flash('success', 'Hotel added successfully!');
        res.redirect('/superadmin/hotels');
    } catch (error) {
        console.error('Add hotel error:', error);
        req.flash('error', 'Error adding hotel');
        res.redirect('/superadmin/hotels/add');
    }
};

// Get edit hotel form
exports.getEditHotel = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const hotel = await Hotel.findById(req.params.id);
        
        if (!hotel) {
            req.flash('error', 'Hotel not found');
            return res.redirect('/superadmin/hotels');
        }
        
        res.render('superadmin/add-hotel', {
            title: 'Edit Hotel - RevaampAP',
            user: user,
            hotel: hotel,
            currentPath: '/superadmin/hotels'
        });
    } catch (error) {
        console.error('Get edit hotel error:', error);
        req.flash('error', 'Error loading hotel');
        res.redirect('/superadmin/hotels');
    }
};

// Update hotel
exports.updateHotel = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        
        if (!hotel) {
            req.flash('error', 'Hotel not found');
            return res.redirect('/superadmin/hotels');
        }
        
        const {
            name, description, address, city, state, country,
            phone, email, website, commissionRate,
            amenities, featured, rating, isActive
        } = req.body;
        
        hotel.name = name.trim();
        hotel.description = description;
        hotel.location = { address, city, state, country };
        hotel.contactInfo = { phone, email, website };
        hotel.commissionRate = parseFloat(commissionRate) || 30;
        hotel.amenities = amenities ? (Array.isArray(amenities) ? amenities : [amenities]) : [];
        hotel.featured = featured === 'on';
        hotel.rating = parseFloat(rating) || 0;
        hotel.isActive = isActive === 'on';
        
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                if (index === 0 && hotel.images.length === 0) {
                    hotel.images.push({
                        url: '/uploads/hotels/' + file.filename,
                        isPrimary: true
                    });
                } else {
                    hotel.images.push({
                        url: '/uploads/hotels/' + file.filename,
                        isPrimary: false
                    });
                }
            });
        }
        
        await hotel.save();
        
        req.flash('success', 'Hotel updated successfully!');
        res.redirect('/superadmin/hotels');
    } catch (error) {
        console.error('Update hotel error:', error);
        req.flash('error', 'Error updating hotel');
        res.redirect('/superadmin/hotels');
    }
};

// Delete hotel
exports.deleteHotel = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        
        if (!hotel) {
            return res.status(404).json({ error: 'Hotel not found' });
        }
        
        await hotel.deleteOne();
        res.json({ success: true });
    } catch (error) {
        console.error('Delete hotel error:', error);
        res.status(500).json({ error: 'Error deleting hotel' });
    }
};

// Toggle hotel status
exports.toggleHotelStatus = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        
        if (!hotel) {
            return res.status(404).json({ error: 'Hotel not found' });
        }
        
        hotel.isActive = !hotel.isActive;
        await hotel.save();
        
        res.json({ success: true, isActive: hotel.isActive });
    } catch (error) {
        console.error('Toggle hotel status error:', error);
        res.status(500).json({ error: 'Error toggling status' });
    }
};

// Toggle featured hotel
exports.toggleFeatured = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        
        if (!hotel) {
            return res.status(404).json({ error: 'Hotel not found' });
        }
        
        hotel.featured = !hotel.featured;
        await hotel.save();
        
        res.json({ success: true, featured: hotel.featured });
    } catch (error) {
        console.error('Toggle featured error:', error);
        res.status(500).json({ error: 'Error toggling featured' });
    }
};

// ============= PUBLIC HOTEL ROUTES =============

// Get all hotels for public view
exports.getHotels = async (req, res) => {
    try {
        const { city, state, page = 1 } = req.query;
        const limit = 12;
        const skip = (page - 1) * limit;
        
        let query = { isActive: true };
        
        if (city) query['location.city'] = new RegExp(city, 'i');
        if (state) query['location.state'] = new RegExp(state, 'i');
        
        const hotels = await Hotel.find(query)
            .sort('-featured', '-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await Hotel.countDocuments(query);
        
        res.render('hotels/index', {
            title: 'Partner Hotels - RevaampAP',
            hotels: hotels,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total: total,
            filters: req.query,
            user: req.session.userId ? { name: req.session.userName, type: req.session.userType } : null
        });
    } catch (error) {
        console.error('Get hotels error:', error);
        res.status(500).send('Error loading hotels');
    }
};

// Get single hotel detail with unique tracking link
exports.getHotelDetail = async (req, res) => {
    try {
        const { slug } = req.params;
        const userType = req.session.userType;
        const userId = req.session.userId;
        
        const hotel = await Hotel.findOne({ slug, isActive: true });
        
        if (!hotel) {
            return res.status(404).send('Hotel not found');
        }
        
        let uniqueLink = null;
        let uniqueCode = null;
        
        // Generate unique tracking link for promoter or business partner
        if (userId && (userType === 'promoter' || userType === 'business_partner')) {
            uniqueCode = crypto.randomBytes(16).toString('hex');
            uniqueLink = `${process.env.BASE_URL || 'http://localhost:3000'}/hotels/track/${hotel._id}/${uniqueCode}`;
        }
        
        res.render('hotels/detail', {
            title: `${hotel.name} - RevaampAP`,
            hotel: hotel,
            uniqueLink: uniqueLink,
            uniqueCode: uniqueCode,
            userType: userType,
            user: req.session.userId ? { name: req.session.userName, type: userType } : null
        });
    } catch (error) {
        console.error('Get hotel detail error:', error);
        res.status(500).send('Error loading hotel');
    }
};

// Track hotel click from unique link
exports.trackHotelClick = async (req, res) => {
    try {
        const { hotelId, code } = req.params;
        
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) {
            return res.status(404).send('Hotel not found');
        }
        
        // Find who owns this unique code (promoter or business partner)
        let promoter = null;
        let businessPartner = null;
        let clickerType = 'anonymous';
        
        const user = await User.findOne({ 'promoterProfile.uniqueLinks.code': code });
        if (user && user.userType === 'promoter') {
            promoter = user._id;
            clickerType = 'promoter';
        } else {
            const businessUser = await User.findOne({ 'businessPartnerProfile.uniqueLinks.code': code });
            if (businessUser && businessUser.userType === 'business_partner') {
                businessPartner = businessUser._id;
                clickerType = 'business_partner';
            }
        }
        
        // Record the click
        const click = new HotelClick({
            hotel: hotelId,
            promoter: promoter,
            businessPartner: businessPartner,
            clickerType: clickerType,
            uniqueLinkCode: code,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            referrer: req.headers.referer || null,
            clickedAt: new Date()
        });
        
        await click.save();
        
        // Redirect to hotel detail page with click ID in session for tracking conversion
        req.session.hotelClickId = click._id;
        
        res.redirect(`/hotels/${hotel.slug}?ref=${code}`);
    } catch (error) {
        console.error('Track hotel click error:', error);
        res.status(500).send('Error tracking click');
    }
};

// ============= PROMOTER HOTEL STATS =============

// Get promoter hotel stats
exports.getPromoterHotelStats = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const clicks = await HotelClick.find({ 
            promoter: req.session.userId 
        }).populate('hotel', 'name').sort('-clickedAt');
        
        const bookings = await HotelBooking.find({ 
            promoter: req.session.userId 
        }).populate('hotel', 'name').sort('-createdAt');
        
        const stats = {
            totalClicks: clicks.length,
            totalBookings: bookings.length,
            totalCommission: bookings.reduce((sum, b) => sum + b.commissionAmount, 0),
            pendingCommission: bookings.filter(b => b.paymentStatus !== 'completed').reduce((sum, b) => sum + b.commissionAmount, 0)
        };
        
        res.render('promoter/hotel-stats', {
            title: 'Hotel Promotions - RevaampAP',
            user: user,
            clicks: clicks,
            bookings: bookings,
            stats: stats,
            currentPath: '/promoter/hotels'
        });
    } catch (error) {
        console.error('Get promoter hotel stats error:', error);
        req.flash('error', 'Error loading hotel stats');
        res.redirect('/promoter/dashboard');
    }
};

// ============= BUSINESS PARTNER HOTEL STATS =============

// Get business partner hotel stats
exports.getBusinessPartnerHotelStats = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const clicks = await HotelClick.find({ 
            businessPartner: req.session.userId 
        }).populate('hotel', 'name').sort('-clickedAt');
        
        const bookings = await HotelBooking.find({ 
            businessPartner: req.session.userId 
        }).populate('hotel', 'name').sort('-createdAt');
        
        const stats = {
            totalClicks: clicks.length,
            totalBookings: bookings.length,
            totalCommission: bookings.reduce((sum, b) => sum + b.commissionAmount, 0),
            pendingCommission: bookings.filter(b => b.paymentStatus !== 'completed').reduce((sum, b) => sum + b.commissionAmount, 0)
        };
        
        res.render('business-partner/hotel-stats', {
            title: 'Hotel Promotions - RevaampAP',
            user: user,
            clicks: clicks,
            bookings: bookings,
            stats: stats,
            currentPath: '/business-partner/hotels'
        });
    } catch (error) {
        console.error('Get business partner hotel stats error:', error);
        req.flash('error', 'Error loading hotel stats');
        res.redirect('/business-partner/dashboard');
    }
};