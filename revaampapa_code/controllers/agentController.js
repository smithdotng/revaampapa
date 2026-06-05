// controllers/agentController.js
const User = require('../models/User');
const Property = require('../models/Property');
const Transaction = require('../models/Transaction');
const Promotion = require('../models/Promotion');
const Click = require('../models/Click');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Helper function to get base URL (works for both localhost and production)
function getBaseUrl(req) {
    // Use environment variable for production domain
    if (process.env.BASE_URL) {
        return process.env.BASE_URL;
    }
    // Fallback to request protocol and host
    return `${req.protocol}://${req.get('host')}`;
}

// Helper function to get absolute URL for OG images
function getAbsoluteImageUrl(req, imagePath) {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = getBaseUrl(req);
    return `${baseUrl}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
}

// Helper function to generate OG tags HTML for social sharing
function generateOGTags(property, baseUrl, req) {
    const propertyUrl = `${baseUrl}/properties/${property.slug}`;
    const imageUrl = getAbsoluteImageUrl(req, property.images && property.images[0] ? property.images[0].url : '/assets/images/og-default.jpg');
    
    // Generate description from property details
    let description = property.description.substring(0, 150);
    if (property.features.bedrooms) {
        description = `${property.features.bedrooms} bedroom ${property.propertyType} in ${property.location.city}. ${description}`;
    }
    
    return {
        title: `${property.title} - ${property.transactionType === 'sale' ? 'For Sale' : 'For Rent'} | Found Properties`,
        description: description,
        image: imageUrl,
        url: propertyUrl,
        siteName: 'Found Properties',
        type: 'article',
        locale: 'en_NG',
        // Additional OG tags for rich preview
        ogTags: `
            <meta property="og:title" content="${property.title} - ${property.transactionType === 'sale' ? 'For Sale' : 'For Rent'} | Found Properties" />
            <meta property="og:description" content="${description}" />
            <meta property="og:image" content="${imageUrl}" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:url" content="${propertyUrl}" />
            <meta property="og:type" content="article" />
            <meta property="og:site_name" content="Found Properties" />
            <meta property="og:locale" content="en_NG" />
            <meta property="article:published_time" content="${property.createdAt.toISOString()}" />
            <meta property="article:modified_time" content="${property.updatedAt.toISOString()}" />
            <meta property="article:section" content="${property.propertyType}" />
            ${property.location.city ? `<meta property="article:tag" content="${property.location.city}" />` : ''}
            ${property.location.state ? `<meta property="article:tag" content="${property.location.state}" />` : ''}
            <meta property="article:tag" content="${property.transactionType}" />
            <meta property="article:tag" content="Real Estate Nigeria" />
            
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="${property.title} - ${property.transactionType === 'sale' ? 'For Sale' : 'For Rent'} | Found Properties" />
            <meta name="twitter:description" content="${description}" />
            <meta name="twitter:image" content="${imageUrl}" />
            <meta name="twitter:site" content="@foundproperties" />
            <meta name="twitter:creator" content="@foundproperties" />
        `
    };
}

// Helper function to generate share text for social media
function generateShareText(property, referralLink) {
    const priceText = property.transactionType === 'sale' 
        ? `₦${property.price.toLocaleString()}`
        : `₦${property.price.toLocaleString()}/year`;
    
    const locationText = `${property.location.city}, ${property.location.state}`;
    const featureText = property.features.bedrooms 
        ? `${property.features.bedrooms} bedroom ${property.propertyType}`
        : property.propertyType;
    
    return {
        facebook: `🏠 Just found this amazing property on Found Properties!\n\n📍 ${featureText} in ${locationText}\n💰 ${priceText}\n\nClick the link to view details: ${referralLink}`,
        twitter: `🏠 ${featureText} in ${locationText} | ${priceText}\n\nCheck it out on Found Properties! ${referralLink}`,
        whatsapp: `🏠 ${featureText} in ${locationText}\n💰 ${priceText}\n\nView details: ${referralLink}`,
        linkedin: `I'm excited to share this property listing on Found Properties!\n\n🏠 ${property.title}\n📍 ${locationText}\n💰 ${priceText}\n\nView the full listing here: ${referralLink}`,
        instagram: `🏠 ${property.title}\n📍 ${locationText}\n💰 ${priceText}\n\nCheck out this amazing property! #FoundProperties #RealEstate #Property #NigeriaRealEstate`
    };
}

// ============= PAGE ROUTES =============

// Agent dashboard
exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        // Get recent transactions
        const recentTransactions = await Transaction.find({ agent: user._id })
            .populate('property', 'title location price')
            .sort('-transactionDate')
            .limit(10);
        
        // Get statistics
        const totalClicks = user.referralStats?.totalClicks || 0;
        const totalTransactions = user.referralStats?.totalTransactions || 0;
        const totalEarnings = user.agentProfile?.totalEarnings || 0;
        const pendingWithdrawal = user.agentProfile?.pendingWithdrawal || 0;
        
        // Get conversion rate
        const conversionRate = totalClicks > 0 
            ? ((totalTransactions / totalClicks) * 100).toFixed(1) 
            : 0;
        
        // Get monthly earnings for chart
        const monthlyEarnings = await Transaction.aggregate([
            { 
                $match: { 
                    agent: user._id,
                    paymentStatus: 'completed'
                } 
            },
            {
                $group: {
                    _id: { 
                        year: { $year: '$transactionDate' },
                        month: { $month: '$transactionDate' }
                    },
                    total: { $sum: '$commissionSplit.agent.amount' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 }
        ]);
        
        res.render('agent-dashboard', {
            title: 'Agent Dashboard - Found Properties',
            user: user,
            transactions: recentTransactions,
            stats: {
                totalClicks,
                totalTransactions,
                totalEarnings,
                pendingWithdrawal,
                conversionRate,
                monthlyEarnings
            },
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Agent dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
};

// Get referral link page
exports.getReferralLinkPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        res.render('agent/referral-link', {
            title: 'My Referral Link - Found',
            user: user,
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Get referral link page error:', error);
        req.flash('error', 'Error loading page');
        res.redirect('/agent/dashboard');
    }
};

// Get earnings page
exports.getEarningsPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const transactions = await Transaction.find({ 
            agent: user._id,
            paymentStatus: 'completed'
        })
        .populate('property', 'title price location')
        .sort('-transactionDate');
        
        const totalEarnings = transactions.reduce((sum, t) => sum + (t.commissionSplit?.agent?.amount || 0), 0);
        const pendingWithdrawal = user.agentProfile?.pendingWithdrawal || 0;
        
        res.render('agent/earnings', {
            title: 'My Earnings - Found',
            user: user,
            transactions: transactions,
            totals: {
                totalEarnings,
                pendingWithdrawal,
                withdrawn: totalEarnings - pendingWithdrawal
            },
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Get earnings page error:', error);
        req.flash('error', 'Error loading earnings');
        res.redirect('/agent/dashboard');
    }
};

// Get available properties page
exports.getAvailablePropertiesPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const properties = await Property.find({ 
            status: 'available'
        })
        .select('title price location images propertyType transactionType slug description features')
        .sort('-createdAt')
        .limit(50);
        
        // Add share data for each property
        const baseUrl = getBaseUrl(req);
        const propertiesWithShareData = properties.map(property => ({
            ...property.toObject(),
            shareData: generateShareText(property, `${baseUrl}/properties/${property.slug}`),
            ogTags: generateOGTags(property, baseUrl, req)
        }));
        
        res.render('agent/available-properties', {
            title: 'Available Properties - Found',
            user: user,
            properties: propertiesWithShareData,
            baseUrl: baseUrl
        });
    } catch (error) {
        console.error('Get available properties page error:', error);
        req.flash('error', 'Error loading properties');
        res.redirect('/agent/dashboard');
    }
};

// Get promotions page
exports.getPromotionsPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        res.render('agent/promotions', {
            title: 'My Promotions - Found',
            user: user,
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Get promotions page error:', error);
        req.flash('error', 'Error loading promotions');
        res.redirect('/agent/dashboard');
    }
};

// Get analytics page
exports.getAnalyticsPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        res.render('agent/analytics', {
            title: 'Analytics - Found',
            user: user,
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Get analytics page error:', error);
        req.flash('error', 'Error loading analytics');
        res.redirect('/agent/dashboard');
    }
};

// Get settings page
exports.getSettingsPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        res.render('agent/settings', {
            title: 'Settings - Found',
            user: user,
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Get settings page error:', error);
        req.flash('error', 'Error loading settings');
        res.redirect('/agent/dashboard');
    }
};

// ============= API ROUTES =============

// Get agent's promotions (API)
exports.getAgentPromotions = async (req, res) => {
    try {
        console.log('Fetching promotions for agent:', req.session.userId);
        
        const promotions = await Promotion.find({ agent: req.session.userId })
            .populate('property', 'title price location images propertyType transactionType slug description features')
            .sort('-createdAt')
            .lean();
        
        const baseUrl = getBaseUrl(req);
        
        // Add full referral links, share data, and OG tags for each promotion
        const enrichedPromotions = promotions.map(promo => {
            const property = promo.property;
            const referralLink = `${baseUrl}/r/${promo.referralCode}`;
            const propertyUrl = `${baseUrl}/properties/${property?.slug}`;
            
            return {
                ...promo,
                referralLink: referralLink,
                propertyUrl: propertyUrl,
                shareText: property ? generateShareText(property, referralLink) : {},
                ogTags: property ? generateOGTags(property, baseUrl, req) : null,
                shareData: {
                    facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
                    twitterUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(property ? `${property.title} - ${property.transactionType === 'sale' ? 'For Sale' : 'For Rent'} in ${property.location.city}` : 'Property')}&url=${encodeURIComponent(referralLink)}`,
                    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(property ? `${property.title} - ${property.transactionType === 'sale' ? 'For Sale' : 'For Rent'} in ${property.location.city}\n\n${referralLink}` : referralLink)}`,
                    linkedinUrl: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(referralLink)}&title=${encodeURIComponent(property?.title || 'Property')}&summary=${encodeURIComponent(property?.description?.substring(0, 200) || '')}`,
                    instagramShareText: property ? generateShareText(property, referralLink).instagram : `Check out this property! ${referralLink}`
                }
            };
        });
        
        console.log('Found promotions count:', promotions.length);
        
        res.json({
            success: true,
            promotions: enrichedPromotions
        });
    } catch (error) {
        console.error('Get agent promotions error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            promotions: [] 
        });
    }
};

// Get promotion stats (API)
exports.getPromotionStats = async (req, res) => {
    try {
        const { id } = req.params;
        
        const promotion = await Promotion.findById(id)
            .populate('property', 'title price location images description features');
        
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion not found' });
        }
        
        if (promotion.agent.toString() !== req.session.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
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
        
        const conversionRate = promotion.clicks > 0 
            ? ((promotion.transactions / promotion.clicks) * 100).toFixed(2)
            : 0;
        
        const baseUrl = getBaseUrl(req);
        const referralLink = `${baseUrl}/r/${promotion.referralCode}`;
        
        res.json({
            success: true,
            promotion,
            shareText: promotion.property ? generateShareText(promotion.property, referralLink) : {},
            stats: {
                totalClicks: promotion.clicks,
                inquiries: promotion.inquiries,
                transactions: promotion.transactions,
                earnings: promotion.earnings,
                conversionRate,
                clicksOverTime
            }
        });
    } catch (error) {
        console.error('Get promotion stats error:', error);
        res.status(500).json({ error: 'Error loading promotion stats' });
    }
};

// Track social share (API)
exports.trackSocialShare = async (req, res) => {
    try {
        const { id, platform } = req.params;
        
        const promotion = await Promotion.findById(id);
        
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion not found' });
        }
        
        if (promotion.agent.toString() !== req.session.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        if (!promotion.socialShares) promotion.socialShares = {};
        promotion.socialShares[platform] = (promotion.socialShares[platform] || 0) + 1;
        await promotion.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Track social share error:', error);
        res.status(500).json({ error: 'Error tracking share' });
    }
};

// Create promotion via API
exports.createPromotionAPI = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const baseUrl = getBaseUrl(req);
        
        // Check if promotion already exists
        let promotion = await Promotion.findOne({
            agent: req.session.userId,
            property: propertyId
        });
        
        if (promotion) {
            // Update the referral link to ensure it has the correct base URL
            promotion.referralLink = `${baseUrl}/r/${promotion.referralCode}`;
            await promotion.save();
            
            return res.json({ 
                success: true, 
                exists: true, 
                promotion,
                shareText: promotion.property ? generateShareText(promotion.property, promotion.referralLink) : {},
                message: 'Promotion already exists for this property'
            });
        }
        
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        // Create new promotion
        promotion = new Promotion({
            agent: req.session.userId,
            property: propertyId
        });
        
        // Generate unique referral code
        const prefix = 'FND';
        const agentCode = req.session.userId.toString().slice(-6).toUpperCase();
        const propertyCode = propertyId.toString().slice(-6).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        promotion.referralCode = `${prefix}-${agentCode}-${propertyCode}-${random}`;
        
        // Generate full link with correct base URL
        promotion.referralLink = `${baseUrl}/r/${promotion.referralCode}`;
        
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
        
        const shareText = generateShareText(property, promotion.referralLink);
        
        res.json({
            success: true,
            created: true,
            promotion,
            shareText: shareText
        });
    } catch (error) {
        console.error('Create promotion API error:', error);
        res.status(500).json({ error: 'Error creating promotion' });
    }
};

// Generate QR code (API)
exports.generateQRCodeAPI = async (req, res) => {
    try {
        const { id } = req.params;
        const baseUrl = getBaseUrl(req);
        
        const promotion = await Promotion.findById(id);
        
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion not found' });
        }
        
        if (promotion.agent.toString() !== req.session.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Ensure referral link has correct base URL
        promotion.referralLink = `${baseUrl}/r/${promotion.referralCode}`;
        
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
            qrCode: promotion.qrCode,
            referralLink: promotion.referralLink
        });
    } catch (error) {
        console.error('Generate QR code error:', error);
        res.status(500).json({ error: 'Error generating QR code' });
    }
};

// Download QR code (API)
exports.downloadQRCodeAPI = async (req, res) => {
    try {
        const { id } = req.params;
        
        const promotion = await Promotion.findById(id);
        
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion not found' });
        }
        
        if (promotion.agent.toString() !== req.session.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
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

// Get agent stats (API)
exports.getAgentStatsAPI = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const totalClicks = user.referralStats?.totalClicks || 0;
        const totalTransactions = user.referralStats?.totalTransactions || 0;
        const totalEarnings = user.agentProfile?.totalEarnings || 0;
        const pendingWithdrawal = user.agentProfile?.pendingWithdrawal || 0;
        
        res.json({
            success: true,
            stats: {
                totalClicks,
                totalTransactions,
                totalEarnings,
                pendingWithdrawal
            }
        });
    } catch (error) {
        console.error('Get agent stats error:', error);
        res.status(500).json({ error: 'Error loading stats' });
    }
};

// Get earnings data (API)
exports.getEarningsDataAPI = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const transactions = await Transaction.find({ 
            agent: user._id,
            paymentStatus: 'completed'
        })
        .populate('property', 'title')
        .sort('-transactionDate');
        
        const totalEarnings = transactions.reduce((sum, t) => sum + (t.commissionSplit?.agent?.amount || 0), 0);
        
        // Monthly earnings for last 6 months
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const monthTransactions = transactions.filter(t => {
                const tDate = new Date(t.transactionDate);
                return tDate >= monthStart && tDate <= monthEnd;
            });
            
            const monthTotal = monthTransactions.reduce((sum, t) => sum + (t.commissionSplit?.agent?.amount || 0), 0);
            monthlyData.push({
                month: date.toLocaleString('default', { month: 'short' }),
                earnings: monthTotal
            });
        }
        
        res.json({
            success: true,
            totalEarnings,
            monthlyData
        });
    } catch (error) {
        console.error('Get earnings data error:', error);
        res.status(500).json({ error: 'Error loading earnings data' });
    }
};

// ============= POST ROUTES =============

// Request withdrawal
exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount, bankName, accountNumber, accountName } = req.body;
        const agent = await User.findById(req.session.userId);
        
        if (!agent) {
            req.flash('error', 'Agent not found');
            return res.redirect('/agent/earnings');
        }
        
        // Check if amount is valid
        if (!amount || amount <= 0) {
            req.flash('error', 'Invalid withdrawal amount');
            return res.redirect('/agent/earnings');
        }
        
        // Check if agent has sufficient balance
        if (amount > agent.agentProfile.pendingWithdrawal) {
            req.flash('error', 'Insufficient balance');
            return res.redirect('/agent/earnings');
        }
        
        // Check if bank details are provided
        if (!bankName || !accountNumber || !accountName) {
            req.flash('error', 'Please fill in all bank details');
            return res.redirect('/agent/earnings');
        }
        
        // Update bank details
        agent.agentProfile.bankDetails = {
            bankName,
            accountNumber,
            accountName
        };
        
        // Deduct from pending
        agent.agentProfile.pendingWithdrawal -= parseFloat(amount);
        await agent.save();
        
        req.flash('success', 'Withdrawal request submitted successfully');
        res.redirect('/agent/earnings');
    } catch (error) {
        console.error('Withdrawal error:', error);
        req.flash('error', 'Error processing withdrawal');
        res.redirect('/agent/earnings');
    }
};

// Update bank details
exports.updateBankDetails = async (req, res) => {
    try {
        const { bankName, accountNumber, accountName } = req.body;
        const agent = await User.findById(req.session.userId);
        
        if (!agent) {
            req.flash('error', 'Agent not found');
            return res.redirect('/agent/dashboard');
        }
        
        agent.agentProfile.bankDetails = {
            bankName,
            accountNumber,
            accountName
        };
        
        await agent.save();
        
        req.flash('success', 'Bank details updated successfully');
        res.redirect('/agent/settings');
    } catch (error) {
        console.error('Update bank details error:', error);
        req.flash('error', 'Error updating bank details');
        res.redirect('/agent/settings');
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, socialHandle } = req.body;
        const agent = await User.findById(req.session.userId);
        
        if (!agent) {
            req.flash('error', 'Agent not found');
            return res.redirect('/login');
        }
        
        agent.name = name;
        agent.phone = phone;
        if (socialHandle) {
            agent.agentProfile.socialHandle = socialHandle;
        }
        
        await agent.save();
        
        req.flash('success', 'Profile updated successfully');
        res.redirect('/agent/settings');
    } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/agent/settings');
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const agent = await User.findById(req.session.userId);
        
        if (!agent) {
            req.flash('error', 'Agent not found');
            return res.redirect('/login');
        }
        
        // Verify current password
        const isMatch = await agent.comparePassword(currentPassword);
        if (!isMatch) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/agent/settings');
        }
        
        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/agent/settings');
        }
        
        // Check password length
        if (newPassword.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/agent/settings');
        }
        
        // Update password
        agent.password = newPassword;
        await agent.save();
        
        req.flash('success', 'Password changed successfully');
        res.redirect('/agent/settings');
    } catch (error) {
        console.error('Change password error:', error);
        req.flash('error', 'Error changing password');
        res.redirect('/agent/settings');
    }
};

// Track click on referral link
exports.trackClick = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const agent = await User.findById(req.session.userId);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        
        // Update click count
        agent.referralStats.totalClicks += 1;
        await agent.save();
        
        // Store in session for tracking if transaction happens
        req.session.referringAgent = {
            id: agent._id,
            propertyId: propertyId,
            timestamp: new Date()
        };
        
        res.json({
            success: true,
            message: 'Click tracked'
        });
    } catch (error) {
        console.error('Track click error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error tracking click' 
        });
    }
};

// Create promotion (alternate endpoint)
exports.createPromotion = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const baseUrl = getBaseUrl(req);
        
        // Check if promotion already exists
        let promotion = await Promotion.findOne({
            agent: req.session.userId,
            property: propertyId
        });
        
        if (promotion) {
            // Update the referral link to ensure it has the correct base URL
            promotion.referralLink = `${baseUrl}/r/${promotion.referralCode}`;
            await promotion.save();
            
            req.flash('info', 'Promotion already exists for this property');
            return res.redirect('/agent/promotions');
        }
        
        const property = await Property.findById(propertyId);
        if (!property) {
            req.flash('error', 'Property not found');
            return res.redirect('/agent/available-properties');
        }
        
        // Create new promotion
        promotion = new Promotion({
            agent: req.session.userId,
            property: propertyId
        });
        
        // Generate unique referral code
        const prefix = 'FND';
        const agentCode = req.session.userId.toString().slice(-6).toUpperCase();
        const propertyCode = propertyId.toString().slice(-6).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        promotion.referralCode = `${prefix}-${agentCode}-${propertyCode}-${random}`;
        
        // Generate full link with correct base URL
        promotion.referralLink = `${baseUrl}/r/${promotion.referralCode}`;
        
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
        
        req.flash('success', 'Promotion created successfully!');
        res.redirect('/agent/promotions');
    } catch (error) {
        console.error('Create promotion error:', error);
        req.flash('error', 'Error creating promotion');
        res.redirect('/agent/available-properties');
    }
};