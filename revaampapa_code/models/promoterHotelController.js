const Hotel = require('../models/Hotel');
const HotelClick = require('../models/HotelClick');
const User = require('../models/User');
const crypto = require('crypto');

// Get promoter hotels dashboard
// Get promoter hotels dashboard
exports.getPromoterHotels = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        // Get all active hotels - FIXED SORT SYNTAX
        const hotels = await Hotel.find({ isActive: true }).sort({ featured: -1, createdAt: -1 });
        
        // Get promoter's unique links and stats for each hotel
        const hotelStats = [];
        
        for (const hotel of hotels) {
            // Initialize promoterProfile if needed
            if (!user.promoterProfile) {
                user.promoterProfile = {};
            }
            if (!user.promoterProfile.uniqueLinks) {
                user.promoterProfile.uniqueLinks = [];
            }
            
            // Find or create unique link for this promoter and hotel
            let uniqueLink = user.promoterProfile.uniqueLinks.find(
                link => link.hotelId && link.hotelId.toString() === hotel._id.toString()
            );
            
            if (!uniqueLink) {
                // Generate new unique code
                const uniqueCode = crypto.randomBytes(16).toString('hex');
                uniqueLink = {
                    code: uniqueCode,
                    hotelId: hotel._id,
                    createdAt: new Date()
                };
                
                user.promoterProfile.uniqueLinks.push(uniqueLink);
                await user.save();
            }
            
            // Get stats for this hotel
            const clicks = await HotelClick.countDocuments({
                hotel: hotel._id,
                promoter: req.session.userId,
                uniqueLinkCode: uniqueLink.code
            });
            
            const conversions = await HotelClick.countDocuments({
                hotel: hotel._id,
                promoter: req.session.userId,
                uniqueLinkCode: uniqueLink.code,
                converted: true
            });
            
            const earningsResult = await HotelClick.aggregate([
                {
                    $match: {
                        hotel: hotel._id,
                        promoter: req.session.userId,
                        uniqueLinkCode: uniqueLink.code,
                        converted: true
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$commissionEarned' }
                    }
                }
            ]);
            
            hotelStats.push({
                hotel: hotel,
                uniqueLink: `${process.env.BASE_URL || 'http://localhost:3000'}/hotels/track/${hotel._id}/${uniqueLink.code}`,
                uniqueCode: uniqueLink.code,
                clicks: clicks,
                conversions: conversions,
                earnings: earningsResult.length > 0 ? earningsResult[0].total : 0
            });
        }
        
        // Get recent clicks
        const recentClicks = await HotelClick.find({ 
            promoter: req.session.userId 
        })
        .populate('hotel', 'name')
        .sort({ clickedAt: -1 })
        .limit(20);
        
        // Get total stats
        const totalClicks = await HotelClick.countDocuments({ promoter: req.session.userId });
        const totalConversions = await HotelClick.countDocuments({ promoter: req.session.userId, converted: true });
        
        const totalEarningsResult = await HotelClick.aggregate([
            { $match: { promoter: req.session.userId, converted: true } },
            { $group: { _id: null, total: { $sum: '$commissionEarned' } } }
        ]);
        
        const totalStats = {
            clicks: totalClicks,
            conversions: totalConversions,
            earnings: totalEarningsResult.length > 0 ? totalEarningsResult[0].total : 0
        };
        
        res.render('promoter/hotels', {
            title: 'Hotel Promotions - RevaampAP',
            user: user,
            hotels: hotelStats,
            recentClicks: recentClicks,
            totalStats: totalStats,
            currentPath: '/promoter/hotels'
        });
    } catch (error) {
        console.error('Get promoter hotels error:', error);
        req.flash('error', 'Error loading hotels: ' + error.message);
        res.redirect('/promoter/dashboard');
    }
};

// Get hotel detail with unique link
exports.getHotelDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const hotel = await Hotel.findOne({ _id: id, isActive: true });
        
        if (!hotel) {
            req.flash('error', 'Hotel not found');
            return res.redirect('/promoter/hotels');
        }
        
        // Initialize promoterProfile if needed
        if (!user.promoterProfile) {
            user.promoterProfile = {};
        }
        if (!user.promoterProfile.uniqueLinks) {
            user.promoterProfile.uniqueLinks = [];
        }
        
        // Get or create unique link for this promoter and hotel
        let uniqueLink = user.promoterProfile.uniqueLinks.find(
            link => link.hotelId && link.hotelId.toString() === hotel._id.toString()
        );
        
        if (!uniqueLink) {
            const uniqueCode = crypto.randomBytes(16).toString('hex');
            uniqueLink = {
                code: uniqueCode,
                hotelId: hotel._id,
                createdAt: new Date()
            };
            
            user.promoterProfile.uniqueLinks.push(uniqueLink);
            await user.save();
        }
        
        const shareUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/hotels/track/${hotel._id}/${uniqueLink.code}`;
        
        // Get stats for this hotel
        const clicks = await HotelClick.countDocuments({
            hotel: hotel._id,
            promoter: req.session.userId,
            uniqueLinkCode: uniqueLink.code
        });
        
        const conversions = await HotelClick.countDocuments({
            hotel: hotel._id,
            promoter: req.session.userId,
            uniqueLinkCode: uniqueLink.code,
            converted: true
        });
        
        const recentClicks = await HotelClick.find({
            hotel: hotel._id,
            promoter: req.session.userId
        })
        .populate('hotel', 'name')
        .sort({ clickedAt: -1 })  // FIXED SORT SYNTAX
        .limit(10);
        
        res.render('promoter/hotel-detail', {
            title: `${hotel.name} - Hotel Promotion`,
            user: user,
            hotel: hotel,
            shareUrl: shareUrl,
            uniqueCode: uniqueLink.code,
            stats: {
                clicks: clicks,
                conversions: conversions
            },
            recentClicks: recentClicks,
            currentPath: '/promoter/hotels'
        });
    } catch (error) {
        console.error('Get hotel detail error:', error);
        req.flash('error', 'Error loading hotel details: ' + error.message);
        res.redirect('/promoter/hotels');
    }
};

// Track share (for social media sharing)
exports.trackShare = async (req, res) => {
    try {
        const { hotelId, code, platform } = req.body;
        
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) {
            return res.status(404).json({ success: false, message: 'Hotel not found' });
        }
        
        // Update hotel share count
        hotel.totalShares = (hotel.totalShares || 0) + 1;
        await hotel.save();
        
        // Record share in click tracking
        const click = new HotelClick({
            hotel: hotelId,
            promoter: req.session.userId,
            userType: 'promoter',
            uniqueLinkCode: code,
            userAgent: req.headers['user-agent'],
            referrer: platform,
            clickedAt: new Date()
        });
        
        await click.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Track share error:', error);
        res.status(500).json({ success: false, message: 'Error tracking share' });
    }
};