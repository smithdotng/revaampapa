// controllers/promoterController.js
const User = require('../models/User');
const Property = require('../models/Property');
const Transaction = require('../models/Transaction');
const Promotion = require('../models/Promotion');
const Click = require('../models/Click');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Models for new features
const PropertyIntroduction = require('../models/PropertyIntroduction');
const BuyerIntroduction = require('../models/BuyerIntroduction');
const HotelPartner = require('../models/HotelPartner');
const Referral = require('../models/Referral');
const Interest = require('../models/Interest');

// Helper function to get base URL
function getBaseUrl(req) {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    return `${req.protocol}://${req.get('host')}`;
}

// Helper function to generate share text
function generateShareText(property, referralLink) {
    const priceText = property.transactionType === 'sale' 
        ? `₦${property.price.toLocaleString()}`
        : `₦${property.price.toLocaleString()}/year`;
    
    const locationText = `${property.location.city}, ${property.location.state}`;
    const featureText = property.features.bedrooms 
        ? `${property.features.bedrooms} bedroom ${property.propertyType}`
        : property.propertyType;
    
    return {
        facebook: `🏠 Just found this amazing property on RevaampAP!\n\n📍 ${featureText} in ${locationText}\n💰 ${priceText}\n\nClick the link to view details: ${referralLink}`,
        twitter: `🏠 ${featureText} in ${locationText} | ${priceText}\n\nCheck it out on RevaampAP! ${referralLink}`,
        whatsapp: `🏠 ${featureText} in ${locationText}\n💰 ${priceText}\n\nView details: ${referralLink}`,
        linkedin: `I'm excited to share this property listing on RevaampAP!\n\n🏠 ${property.title}\n📍 ${locationText}\n💰 ${priceText}\n\nView the full listing here: ${referralLink}`
    };
}

// ============= DASHBOARD =============

// Promoter Dashboard
exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        // Get recent transactions
        const transactions = await Transaction.find({ promoter: user._id })
            .populate('property', 'title price location')
            .sort('-transactionDate')
            .limit(10);
        
        // Get statistics
        const totalClicks = user.referralStats?.totalClicks || 0;
        const totalTransactions = user.referralStats?.totalTransactions || 0;
        const totalEarnings = user.promoterProfile?.totalEarnings || 0;
        const pendingWithdrawal = user.promoterProfile?.pendingWithdrawal || 0;
        const totalInterests = user.referralStats?.totalInterests || 0;
        
        // Get conversion rate
        const conversionRate = totalClicks > 0 
            ? ((totalTransactions / totalClicks) * 100).toFixed(1) 
            : 0;
        
        // Get monthly earnings for chart
        const monthlyEarnings = await Transaction.aggregate([
            { 
                $match: { 
                    promoter: user._id,
                    paymentStatus: 'completed'
                } 
            },
            {
                $group: {
                    _id: { 
                        year: { $year: '$transactionDate' },
                        month: { $month: '$transactionDate' }
                    },
                    total: { $sum: '$commissionSplit.promoter.amount' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 }
        ]);
        
        // Get all available properties for promotion
        const availableProperties = await Property.find({ 
            verificationStatus: 'verified',
            status: 'available'
        })
        .select('title price location images propertyType transactionType slug description features _id')
        .sort('-createdAt')
        .limit(50);
        
        // Get referral statistics
        const referredPromoters = await Referral.countDocuments({ 
            referrer: user._id, 
            type: 'promoter' 
        });
        const referredPartners = await Referral.countDocuments({ 
            referrer: user._id, 
            type: 'business_partner' 
        });
        const referredAggregators = await Referral.countDocuments({ 
            referrer: user._id, 
            type: 'sub_aggregator' 
        });
        const onboardedHotels = await HotelPartner.countDocuments({ 
            promoter: user._id 
        });
        
        // Get base URL for referral links
        const baseUrl = getBaseUrl(req);
        
        res.render('promoter/dashboard', {
            title: 'Promoter Dashboard - RevaampAP',
            user: user,
            transactions: transactions,
            properties: availableProperties,
            stats: {
                totalClicks,
                totalTransactions,
                totalEarnings,
                pendingWithdrawal,
                conversionRate,
                monthlyEarnings,
                totalInterests,
                referredPromoters,
                referredPartners,
                referredAggregators,
                onboardedHotels
            },
            baseUrl: baseUrl
        });
    } catch (error) {
        console.error('Promoter dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
};

// ============= REFERRAL LINK PAGES =============

// Get referral link page
exports.getReferralLinkPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('promoter/referral-link', {
            title: 'My Referral Link - RevaampAP',
            user: user,
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Get referral link page error:', error);
        req.flash('error', 'Error loading page');
        res.redirect('/promoter/dashboard');
    }
};

// ============= PROPERTY INTRODUCTION =============

// Submit property introduction page
exports.getSubmitPropertyPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('promoter/submit-property', {
            title: 'Submit Property Introduction - RevaampAP',
            user: user
        });
    } catch (error) {
        console.error('Get submit property page error:', error);
        res.redirect('/promoter/dashboard');
    }
};

// Submit property introduction
exports.submitProperty = async (req, res) => {
    try {
        const { 
            propertyTitle, propertyType, propertyLocation, propertyValue, 
            ownerName, ownerPhone, ownerEmail, propertyDescription 
        } = req.body;
        
        // Handle file uploads for property documents
        let documentUrls = [];
        if (req.files && req.files.length > 0) {
            documentUrls = req.files.map(file => '/uploads/properties/' + file.filename);
        }
        
        const propertyIntro = new PropertyIntroduction({
            promoter: req.session.userId,
            title: propertyTitle,
            propertyType: propertyType,
            location: propertyLocation,
            value: parseFloat(propertyValue),
            description: propertyDescription,
            owner: {
                name: ownerName,
                phone: ownerPhone,
                email: ownerEmail
            },
            documents: documentUrls,
            status: 'pending',
            commissionRate: 40 // 40% for property introduction
        });
        
        await propertyIntro.save();
        
        req.flash('success', 'Property submitted successfully! Our team will review and contact you within 48 hours.');
        res.redirect('/promoter/dashboard');
    } catch (error) {
        console.error('Submit property error:', error);
        req.flash('error', 'Error submitting property. Please try again.');
        res.redirect('/promoter/submit-property');
    }
};

// ============= BUYER INTRODUCTION =============

// Submit buyer introduction page
exports.getSubmitBuyerPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const properties = await Property.find({ 
            verificationStatus: 'verified',
            status: 'available'
        }).select('title slug price location');
        
        res.render('promoter/submit-buyer', {
            title: 'Submit Buyer Introduction - RevaampAP',
            user: user,
            properties: properties
        });
    } catch (error) {
        console.error('Get submit buyer page error:', error);
        res.redirect('/promoter/dashboard');
    }
};

// Submit buyer introduction
exports.submitBuyer = async (req, res) => {
    try {
        const { 
            buyerName, buyerPhone, buyerEmail, propertyInterested, 
            budget, locationPreference, message 
        } = req.body;
        
        const buyerIntro = new BuyerIntroduction({
            promoter: req.session.userId,
            buyer: {
                name: buyerName,
                phone: buyerPhone,
                email: buyerEmail
            },
            propertyInterested: propertyInterested || null,
            budget: budget ? parseFloat(budget) : null,
            locationPreference: locationPreference,
            message: message,
            status: 'pending',
            commissionRateBuyer: 90, // 90% from buyer
            commissionRateSeller: 50  // 50% from seller
        });
        
        await buyerIntro.save();
        
        req.flash('success', 'Buyer information submitted successfully! Our team will match them with suitable properties.');
        res.redirect('/promoter/dashboard');
    } catch (error) {
        console.error('Submit buyer error:', error);
        req.flash('error', 'Error submitting buyer information. Please try again.');
        res.redirect('/promoter/submit-buyer');
    }
};

// ============= HOTEL ONBOARDING =============

// Onboard hotel page
exports.getOnboardHotelPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('promoter/onboard-hotel', {
            title: 'Onboard Partner Hotel - RevaampAP',
            user: user
        });
    } catch (error) {
        console.error('Get onboard hotel page error:', error);
        res.redirect('/promoter/dashboard');
    }
};

// Onboard hotel
exports.onboardHotel = async (req, res) => {
    try {
        const { 
            hotelName, hotelLocation, hotelAddress, 
            contactPerson, contactPhone, contactEmail,
            roomTypes, commissionRate
        } = req.body;
        
        // Handle file uploads for hotel documents
        let documentUrls = [];
        if (req.files && req.files.length > 0) {
            documentUrls = req.files.map(file => '/uploads/hotels/' + file.filename);
        }
        
        const hotel = new HotelPartner({
            promoter: req.session.userId,
            name: hotelName,
            location: hotelLocation,
            address: hotelAddress,
            contact: {
                name: contactPerson,
                phone: contactPhone,
                email: contactEmail
            },
            roomTypes: roomTypes ? JSON.parse(roomTypes) : [],
            documents: documentUrls,
            status: 'pending',
            commissionRate: commissionRate || 30,
            promoterCommission: 30 // Promoter earns 30% of Revacom's commission
        });
        
        await hotel.save();
        
        req.flash('success', 'Hotel submitted for onboarding! Our team will contact the hotel within 48 hours.');
        res.redirect('/promoter/dashboard');
    } catch (error) {
        console.error('Onboard hotel error:', error);
        req.flash('error', 'Error onboarding hotel. Please try again.');
        res.redirect('/promoter/onboard-hotel');
    }
};

// ============= REFERRAL LINKS FOR DIFFERENT TYPES =============

// Get voucher subscription link
exports.getVoucherLink = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const voucherLink = `${getBaseUrl(req)}/voucher/register?ref=${user._id}`;
        
        // Track referral creation
        const existingReferral = await Referral.findOne({
            referrer: user._id,
            type: 'voucher_subscriber'
        });
        
        if (!existingReferral) {
            const referral = new Referral({
                referrer: user._id,
                type: 'voucher_subscriber',
                referralCode: `VCH-${user._id.toString().slice(-6)}-${Date.now()}`,
                commissionRate: 50
            });
            await referral.save();
        }
        
        res.json({ success: true, link: voucherLink });
    } catch (error) {
        console.error('Get voucher link error:', error);
        res.status(500).json({ error: 'Error generating link' });
    }
};

// Get business partner referral link
exports.getBusinessPartnerLink = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const partnerLink = `${getBaseUrl(req)}/business-partner/register?ref=${user._id}`;
        
        // Track referral creation
        const existingReferral = await Referral.findOne({
            referrer: user._id,
            type: 'business_partner'
        });
        
        if (!existingReferral) {
            const referral = new Referral({
                referrer: user._id,
                type: 'business_partner',
                referralCode: `BP-${user._id.toString().slice(-6)}-${Date.now()}`,
                commissionAmount: 10000 // ₦10,000
            });
            await referral.save();
        }
        
        res.json({ success: true, link: partnerLink });
    } catch (error) {
        console.error('Get partner link error:', error);
        res.status(500).json({ error: 'Error generating link' });
    }
};

// Get sub-aggregator referral link
exports.getAggregatorLink = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const aggregatorLink = `${getBaseUrl(req)}/aggregator/register?ref=${user._id}`;
        
        // Track referral creation
        const existingReferral = await Referral.findOne({
            referrer: user._id,
            type: 'sub_aggregator'
        });
        
        if (!existingReferral) {
            const referral = new Referral({
                referrer: user._id,
                type: 'sub_aggregator',
                referralCode: `SA-${user._id.toString().slice(-6)}-${Date.now()}`,
                commissionAmount: 25000 // ₦25,000
            });
            await referral.save();
        }
        
        res.json({ success: true, link: aggregatorLink });
    } catch (error) {
        console.error('Get aggregator link error:', error);
        res.status(500).json({ error: 'Error generating link' });
    }
};

// Get promoter referral link (for referring other promoters)
exports.getPromoterReferralLink = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const promoterLink = `${getBaseUrl(req)}/promoter/register?ref=${user._id}`;
        
        res.json({ success: true, link: promoterLink });
    } catch (error) {
        console.error('Get promoter referral link error:', error);
        res.status(500).json({ error: 'Error generating link' });
    }
};

// ============= PROMOTIONS =============

// Get promotions page
exports.getPromotionsPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('promoter/promotions', {
            title: 'My Promotions - RevaampAP',
            user: user,
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Get promotions page error:', error);
        req.flash('error', 'Error loading promotions');
        res.redirect('/promoter/dashboard');
    }
};

// Create promotion (API)
exports.createPromotionAPI = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const baseUrl = getBaseUrl(req);
        
        let promotion = await Promotion.findOne({
            promoter: req.session.userId,
            property: propertyId
        });
        
        if (promotion) {
            return res.json({ 
                success: true, 
                exists: true, 
                promotion,
                message: 'Promotion already exists for this property'
            });
        }
        
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        
        promotion = new Promotion({
            promoter: req.session.userId,
            property: propertyId
        });
        
        // Generate unique referral code
        const prefix = 'RVMP';
        const promoterCode = req.session.userId.toString().slice(-6).toUpperCase();
        const propertyCode = propertyId.toString().slice(-6).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        promotion.referralCode = `${prefix}-${promoterCode}-${propertyCode}-${random}`;
        promotion.referralLink = `${baseUrl}/r/${promotion.referralCode}`;
        
        await promotion.save();
        
        res.json({
            success: true,
            created: true,
            promotion: {
                _id: promotion._id,
                referralCode: promotion.referralCode,
                referralLink: promotion.referralLink
            }
        });
    } catch (error) {
        console.error('Create promotion API error:', error);
        res.status(500).json({ error: 'Error creating promotion' });
    }
};

// Create promotion (POST redirect)
exports.createPromotion = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const baseUrl = getBaseUrl(req);
        
        let promotion = await Promotion.findOne({
            promoter: req.session.userId,
            property: propertyId
        });
        
        if (promotion) {
            req.flash('info', 'Promotion already exists for this property');
            return res.redirect('/promoter/promotions');
        }
        
        const property = await Property.findById(propertyId);
        if (!property) {
            req.flash('error', 'Property not found');
            return res.redirect('/promoter/available-properties');
        }
        
        promotion = new Promotion({
            promoter: req.session.userId,
            property: propertyId
        });
        
        // Generate unique referral code
        const prefix = 'RVMP';
        const promoterCode = req.session.userId.toString().slice(-6).toUpperCase();
        const propertyCode = propertyId.toString().slice(-6).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        promotion.referralCode = `${prefix}-${promoterCode}-${propertyCode}-${random}`;
        promotion.referralLink = `${baseUrl}/r/${promotion.referralCode}`;
        
        await promotion.save();
        
        req.flash('success', 'Promotion created successfully!');
        res.redirect('/promoter/promotions');
    } catch (error) {
        console.error('Create promotion error:', error);
        req.flash('error', 'Error creating promotion');
        res.redirect('/promoter/available-properties');
    }
};

// API: Get all promotions for the promoter
exports.getPromoterPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find({ promoter: req.session.userId })
            .populate('property', 'title price location images propertyType transactionType slug')
            .sort('-createdAt');
        
        const baseUrl = getBaseUrl(req);
        
        // Get click and interest counts for each promotion
        const enrichedPromotions = await Promise.all(promotions.map(async (promo) => {
            const property = promo.property;
            const referralLink = `${baseUrl}/r/${promo.referralCode}`;
            
            // Get interest count for this promotion
            const interestCount = await Interest.countDocuments({ 
                promotion: promo._id 
            });
            
            return {
                ...promo.toObject(),
                referralLink: referralLink,
                interests: interestCount,
                shareText: property ? generateShareText(property, referralLink) : {}
            };
        }));
        
        res.json({
            success: true,
            promotions: enrichedPromotions
        });
    } catch (error) {
        console.error('Get promoter promotions error:', error);
        res.status(500).json({ success: false, error: error.message, promotions: [] });
    }
};

// ============= INTERESTS (Buyer Leads) =============

// API: Get buyer interests for the promoter
exports.getInterestsAPI = async (req, res) => {
    try {
        const interests = await Interest.find({ promoter: req.session.userId })
            .populate('property', 'title')
            .populate('promotion', 'referralCode')
            .sort('-createdAt')
            .limit(50);
        
        res.json({
            success: true,
            interests: interests.map(i => ({
                id: i._id,
                name: i.name,
                email: i.email,
                phone: i.phone,
                propertyTitle: i.property?.title || 'General Inquiry',
                message: i.message,
                status: i.status,
                createdAt: i.createdAt
            }))
        });
    } catch (error) {
        console.error('Get interests error:', error);
        res.json({ success: false, interests: [] });
    }
};

// ============= EARNINGS =============

// Get earnings page
exports.getEarningsPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const transactions = await Transaction.find({ 
            promoter: user._id,
            paymentStatus: 'completed'
        })
        .populate('property', 'title price location')
        .sort('-transactionDate');
        
        const totalEarnings = transactions.reduce((sum, t) => sum + (t.commissionSplit?.promoter?.amount || 0), 0);
        const pendingWithdrawal = user.promoterProfile?.pendingWithdrawal || 0;
        
        res.render('promoter/earnings', {
            title: 'My Earnings - RevaampAP',
            user: user,
            transactions: transactions,
            totals: {
                totalEarnings,
                pendingWithdrawal,
                withdrawn: totalEarnings - pendingWithdrawal
            }
        });
    } catch (error) {
        console.error('Get earnings page error:', error);
        req.flash('error', 'Error loading earnings');
        res.redirect('/promoter/dashboard');
    }
};

// Request withdrawal
exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount, bankName, accountNumber, accountName } = req.body;
        const promoter = await User.findById(req.session.userId);
        
        if (!promoter) {
            req.flash('error', 'Promoter not found');
            return res.redirect('/promoter/earnings');
        }
        
        if (!amount || amount <= 0) {
            req.flash('error', 'Invalid withdrawal amount');
            return res.redirect('/promoter/earnings');
        }
        
        if (amount > promoter.promoterProfile.pendingWithdrawal) {
            req.flash('error', 'Insufficient balance');
            return res.redirect('/promoter/earnings');
        }
        
        if (!bankName || !accountNumber || !accountName) {
            req.flash('error', 'Please fill in all bank details');
            return res.redirect('/promoter/earnings');
        }
        
        promoter.promoterProfile.bankDetails = { bankName, accountNumber, accountName };
        promoter.promoterProfile.pendingWithdrawal -= parseFloat(amount);
        await promoter.save();
        
        req.flash('success', 'Withdrawal request submitted successfully');
        res.redirect('/promoter/earnings');
    } catch (error) {
        console.error('Withdrawal error:', error);
        req.flash('error', 'Error processing withdrawal');
        res.redirect('/promoter/earnings');
    }
};

// ============= ANALYTICS =============

// Get analytics page
exports.getAnalyticsPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('promoter/analytics', {
            title: 'Analytics - RevaampAP',
            user: user
        });
    } catch (error) {
        console.error('Get analytics page error:', error);
        req.flash('error', 'Error loading analytics');
        res.redirect('/promoter/dashboard');
    }
};

// ============= SETTINGS =============

// Get settings page
exports.getSettingsPage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('promoter/settings', {
            title: 'Settings - RevaampAP',
            user: user
        });
    } catch (error) {
        console.error('Get settings page error:', error);
        req.flash('error', 'Error loading settings');
        res.redirect('/promoter/dashboard');
    }
};

// Update bank details
exports.updateBankDetails = async (req, res) => {
    try {
        const { bankName, accountNumber, accountName } = req.body;
        const promoter = await User.findById(req.session.userId);
        
        promoter.promoterProfile.bankDetails = { bankName, accountNumber, accountName };
        await promoter.save();
        
        req.flash('success', 'Bank details updated successfully');
        res.redirect('/promoter/settings');
    } catch (error) {
        console.error('Update bank details error:', error);
        req.flash('error', 'Error updating bank details');
        res.redirect('/promoter/settings');
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, socialHandle } = req.body;
        const promoter = await User.findById(req.session.userId);
        
        promoter.name = name;
        promoter.phone = phone;
        if (socialHandle) {
            promoter.promoterProfile.socialHandle = socialHandle;
        }
        
        await promoter.save();
        
        req.flash('success', 'Profile updated successfully');
        res.redirect('/promoter/settings');
    } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/promoter/settings');
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const promoter = await User.findById(req.session.userId);
        
        const isMatch = await promoter.comparePassword(currentPassword);
        if (!isMatch) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/promoter/settings');
        }
        
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/promoter/settings');
        }
        
        if (newPassword.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/promoter/settings');
        }
        
        promoter.password = newPassword;
        await promoter.save();
        
        req.flash('success', 'Password changed successfully');
        res.redirect('/promoter/settings');
    } catch (error) {
        console.error('Change password error:', error);
        req.flash('error', 'Error changing password');
        res.redirect('/promoter/settings');
    }
};

// ============= API ROUTES =============

// API: Get promoter stats
exports.getPromoterStatsAPI = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.json({
            success: true,
            stats: {
                totalClicks: user.referralStats?.totalClicks || 0,
                totalTransactions: user.referralStats?.totalTransactions || 0,
                totalEarnings: user.promoterProfile?.totalEarnings || 0,
                pendingWithdrawal: user.promoterProfile?.pendingWithdrawal || 0
            }
        });
    } catch (error) {
        console.error('Get promoter stats error:', error);
        res.status(500).json({ error: 'Error loading stats' });
    }
};

// API: Get earnings data
exports.getEarningsDataAPI = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const transactions = await Transaction.find({ 
            promoter: user._id,
            paymentStatus: 'completed'
        }).populate('property', 'title');
        
        const totalEarnings = transactions.reduce((sum, t) => sum + (t.commissionSplit?.promoter?.amount || 0), 0);
        
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
            
            const monthTotal = monthTransactions.reduce((sum, t) => sum + (t.commissionSplit?.promoter?.amount || 0), 0);
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

// API: Get referral stats
exports.getReferralStatsAPI = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const referredPromoters = await Referral.countDocuments({ 
            referrer: user._id, 
            type: 'promoter' 
        });
        const referredPartners = await Referral.countDocuments({ 
            referrer: user._id, 
            type: 'business_partner' 
        });
        const referredAggregators = await Referral.countDocuments({ 
            referrer: user._id, 
            type: 'sub_aggregator' 
        });
        const onboardedHotels = await HotelPartner.countDocuments({ 
            promoter: user._id 
        });
        
        res.json({
            success: true,
            stats: {
                referredPromoters,
                referredPartners,
                referredAggregators,
                onboardedHotels
            }
        });
    } catch (error) {
        console.error('Get referral stats error:', error);
        res.status(500).json({ error: 'Error loading referral stats' });
    }
};