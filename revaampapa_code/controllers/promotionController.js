// controllers/promotionController.js
const Promotion = require('../models/Promotion');
const Property = require('../models/Property');
const Click = require('../models/Click');
const User = require('../models/User');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Get promotion link for a property
exports.getPromotionLink = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const agentId = req.session.userId;
        
        // Check if promotion already exists
        let promotion = await Promotion.findOne({
            agent: agentId,
            property: propertyId
        });
        
        if (!promotion) {
            // Create new promotion
            promotion = new Promotion({
                agent: agentId,
                property: propertyId
            });
            
            // Generate unique referral code
            promotion.generateReferralCode();
            
            // Generate full link
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            promotion.generateReferralLink(baseUrl);
            
            // Generate QR code
            const qrDir = path.join(__dirname, '../public/uploads/qrcodes');
            if (!fs.existsSync(qrDir)) {
                fs.mkdirSync(qrDir, { recursive: true });
            }
            
            const qrFileName = `qr-${promotion.referralCode}.png`;
            const qrPath = path.join(qrDir, qrFileName);
            
            await QRCode.toFile(qrPath, promotion.referralLink, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#ff6b6b',
                    light: '#ffffff'
                }
            });
            
            promotion.qrCode = `/uploads/qrcodes/${qrFileName}`;
            await promotion.save();
        }
        
        res.json({
            success: true,
            referralCode: promotion.referralCode,
            referralLink: promotion.referralLink,
            qrCode: promotion.qrCode,
            promotion: promotion
        });
    } catch (error) {
        console.error('Get promotion link error:', error);
        res.status(500).json({ error: 'Error generating promotion link' });
    }
};

// Track click on promotion link via referral code
exports.trackClickByCode = async (req, res) => {
    try {
        const { referralCode } = req.params;
        
        const promotion = await Promotion.findOne({ referralCode })
            .populate('agent')
            .populate('property');
        
        if (!promotion) {
            return res.redirect('/properties');
        }
        
        // Record click
        const click = new Click({
            promotion: promotion._id,
            agent: promotion.agent._id,
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
        
        // Update agent stats
        const agent = await User.findById(promotion.agent._id);
        if (agent) {
            agent.referralStats.totalClicks += 1;
            await agent.save();
        }
        
        // Store in session for tracking conversion
        req.session.referringAgent = {
            id: promotion.agent._id,
            promotionId: promotion._id,
            propertyId: promotion.property._id,
            referralCode: promotion.referralCode
        };
        
        // Redirect to property
        res.redirect(`/properties/${promotion.property.slug}`);
    } catch (error) {
        console.error('Track click error:', error);
        res.redirect('/properties');
    }
};

// Get agent's promotions
exports.getAgentPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find({ agent: req.session.userId })
            .populate('property', 'title price location images propertyType')
            .sort('-createdAt');
        
        // Calculate stats for each promotion
        const promotionsWithStats = promotions.map(promo => {
            const conversionRate = promo.clicks > 0 
                ? ((promo.transactions / promo.clicks) * 100).toFixed(1)
                : 0;
            
            return {
                ...promo.toObject(),
                conversionRate,
                shareLinks: {
                    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(promo.referralLink)}`,
                    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this property!`)}&url=${encodeURIComponent(promo.referralLink)}`,
                    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${promo.property.title} - ${promo.referralLink}`)}`,
                    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(promo.referralLink)}&title=${encodeURIComponent(promo.property.title)}`,
                    instagram: `instagram://library?AssetPath=${encodeURIComponent(promo.qrCode)}`
                }
            };
        });
        
        res.json({
            success: true,
            promotions: promotionsWithStats
        });
    } catch (error) {
        console.error('Get agent promotions error:', error);
        res.status(500).json({ error: 'Error loading promotions' });
    }
};

// Get single promotion stats
exports.getPromotionStats = async (req, res) => {
    try {
        const { id } = req.params;
        
        const promotion = await Promotion.findById(id)
            .populate('property', 'title price location images');
        
        if (!promotion || promotion.agent.toString() !== req.session.userId) {
            return res.status(404).json({ error: 'Promotion not found' });
        }
        
        // Get clicks over time
        const clicksOverTime = await Click.aggregate([
            { $match: { promotion: promotion._id } },
            {
                $group: {
                    _id: { 
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } },
            { $limit: 30 }
        ]);
        
        // Calculate conversion rate
        const conversionRate = promotion.clicks > 0 
            ? ((promotion.transactions / promotion.clicks) * 100).toFixed(2)
            : 0;
        
        // Calculate average time to convert (if any transactions)
        const transactions = await Click.find({ 
            promotion: promotion._id,
            converted: true 
        });
        
        const avgTimeToConvert = transactions.length > 0
            ? transactions.reduce((sum, t) => {
                const timeDiff = (t.convertedAt - t.createdAt) / (1000 * 60 * 60 * 24);
                return sum + timeDiff;
            }, 0) / transactions.length
            : 0;
        
        res.json({
            success: true,
            promotion,
            stats: {
                totalClicks: promotion.clicks,
                inquiries: promotion.inquiries,
                transactions: promotion.transactions,
                earnings: promotion.earnings,
                conversionRate,
                avgTimeToConvert: avgTimeToConvert.toFixed(1),
                clicksOverTime
            }
        });
    } catch (error) {
        console.error('Get promotion stats error:', error);
        res.status(500).json({ error: 'Error loading promotion stats' });
    }
};

// Track social share
exports.trackSocialShare = async (req, res) => {
    try {
        const { id, platform } = req.params;
        
        const promotion = await Promotion.findById(id);
        
        if (!promotion || promotion.agent.toString() !== req.session.userId) {
            return res.status(404).json({ error: 'Promotion not found' });
        }
        
        // Increment social share count
        if (promotion.socialShares[platform] !== undefined) {
            promotion.socialShares[platform] += 1;
            await promotion.save();
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Track social share error:', error);
        res.status(500).json({ error: 'Error tracking share' });
    }
};

// Generate QR code for promotion
exports.generateQRCode = async (req, res) => {
    try {
        const { id } = req.params;
        
        const promotion = await Promotion.findById(id);
        
        if (!promotion || promotion.agent.toString() !== req.session.userId) {
            return res.status(404).json({ error: 'Promotion not found' });
        }
        
        // Generate QR code
        const qrDir = path.join(__dirname, '../public/uploads/qrcodes');
        if (!fs.existsSync(qrDir)) {
            fs.mkdirSync(qrDir, { recursive: true });
        }
        
        const qrFileName = `qr-${promotion.referralCode}.png`;
        const qrPath = path.join(qrDir, qrFileName);
        
        await QRCode.toFile(qrPath, promotion.referralLink, {
            width: 400,
            margin: 2,
            color: {
                dark: '#ff6b6b',
                light: '#ffffff'
            },
            errorCorrectionLevel: 'H'
        });
        
        promotion.qrCode = `/uploads/qrcodes/${qrFileName}`;
        await promotion.save();
        
        res.json({
            success: true,
            qrCode: promotion.qrCode
        });
    } catch (error) {
        console.error('Generate QR code error:', error);
        res.status(500).json({ error: 'Error generating QR code' });
    }
};

// Download QR code
exports.downloadQRCode = async (req, res) => {
    try {
        const { id } = req.params;
        
        const promotion = await Promotion.findById(id);
        
        if (!promotion || promotion.agent.toString() !== req.session.userId) {
            return res.status(404).json({ error: 'Promotion not found' });
        }
        
        if (!promotion.qrCode) {
            return res.status(404).json({ error: 'QR code not found' });
        }
        
        const qrPath = path.join(__dirname, '../public', promotion.qrCode);
        
        if (!fs.existsSync(qrPath)) {
            return res.status(404).json({ error: 'QR code file not found' });
        }
        
        res.download(qrPath, `qr-${promotion.referralCode}.png`);
    } catch (error) {
        console.error('Download QR code error:', error);
        res.status(500).json({ error: 'Error downloading QR code' });
    }
};