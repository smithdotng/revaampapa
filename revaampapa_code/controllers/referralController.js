// controllers/referralController.js
const Promotion = require('../models/Promotion');
const Click = require('../models/Click');
const User = require('../models/User');

exports.handleReferral = async (req, res) => {
    try {
        const { code } = req.params;
        
        const promotion = await Promotion.findOne({ referralCode: code })
            .populate('promoter')
            .populate('property');
        
        if (!promotion) {
            req.flash('error', 'Invalid referral link');
            return res.redirect('/properties');
        }
        
        // Record click
        const click = new Click({
            promotion: promotion._id,
            promoter: promotion.promoter._id,
            property: promotion.property._id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            referrer: req.get('Referer')
        });
        
        await click.save();
        
        // Update promotion stats
        promotion.clicks += 1;
        promotion.lastClickedAt = new Date();
        await promotion.save();
        
        // Update promoter stats
        const promoter = await User.findById(promotion.promoter._id);
        if (promoter) {
            promoter.referralStats.totalClicks += 1;
            await promoter.save();
        }
        
        // Store in session for tracking conversion
        req.session.referringPromoter = {
            id: promotion.promoter._id,
            promotionId: promotion._id,
            propertyId: promotion.property._id,
            referralCode: promotion.referralCode
        };
        
        // Redirect to property
        res.redirect(`/properties/${promotion.property.slug}`);
    } catch (error) {
        console.error('Handle referral error:', error);
        res.redirect('/properties');
    }
};