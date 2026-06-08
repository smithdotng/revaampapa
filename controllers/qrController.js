const QRCode = require('qrcode');
const User = require('../models/User');
const crypto = require('crypto');

// Generate QR code for promoter registration
exports.generatePromoterQR = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        // Create referral link with user ID
        const referralCode = user.promoterProfile?.referralCode || 
            `PROMO-${user._id.toString().slice(-8)}-${Date.now()}`;
        
        if (!user.promoterProfile?.referralCode) {
            user.promoterProfile.referralCode = referralCode;
            await user.save();
        }
        
        const registrationUrl = `${baseUrl}/promoter/register?ref=${referralCode}`;
        
        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: {
                dark: '#03A6A6',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            success: true,
            qrCode: qrCodeDataUrl,
            url: registrationUrl,
            role: 'promoter'
        });
    } catch (error) {
        console.error('Generate promoter QR error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Generate QR code for business partner registration
exports.generateBusinessPartnerQR = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        const referralCode = user.businessPartnerProfile?.referralCode || 
            `BP-${user._id.toString().slice(-8)}-${Date.now()}`;
        
        if (!user.businessPartnerProfile?.referralCode) {
            user.businessPartnerProfile.referralCode = referralCode;
            await user.save();
        }
        
        const registrationUrl = `${baseUrl}/business-partner/register?ref=${referralCode}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: {
                dark: '#f093fb',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            success: true,
            qrCode: qrCodeDataUrl,
            url: registrationUrl,
            role: 'business_partner'
        });
    } catch (error) {
        console.error('Generate business partner QR error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Generate QR code for agent registration
exports.generateAgentQR = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        const referralCode = `AGENT-${user._id.toString().slice(-8)}-${Date.now()}`;
        
        const registrationUrl = `${baseUrl}/agent/register?ref=${referralCode}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: {
                dark: '#28a745',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            success: true,
            qrCode: qrCodeDataUrl,
            url: registrationUrl,
            role: 'agent'
        });
    } catch (error) {
        console.error('Generate agent QR error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Generate QR code for solicitor registration
exports.generateSolicitorQR = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        const referralCode = `SOL-${user._id.toString().slice(-8)}-${Date.now()}`;
        
        const registrationUrl = `${baseUrl}/solicitor/register?ref=${referralCode}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: {
                dark: '#2c3e50',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            success: true,
            qrCode: qrCodeDataUrl,
            url: registrationUrl,
            role: 'solicitor'
        });
    } catch (error) {
        console.error('Generate solicitor QR error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Generate QR code for hectare solicitor registration
exports.generateHectareSolicitorQR = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        const referralCode = `HSOL-${user._id.toString().slice(-8)}-${Date.now()}`;
        
        const registrationUrl = `${baseUrl}/hectare-solicitor/register?ref=${referralCode}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: {
                dark: '#27ae60',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            success: true,
            qrCode: qrCodeDataUrl,
            url: registrationUrl,
            role: 'hectare_solicitor'
        });
    } catch (error) {
        console.error('Generate hectare solicitor QR error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Generate QR code for property owner registration
exports.generatePropertyOwnerQR = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        const referralCode = `OWNER-${user._id.toString().slice(-8)}-${Date.now()}`;
        
        const registrationUrl = `${baseUrl}/register?ref=${referralCode}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: {
                dark: '#ff6b6b',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            success: true,
            qrCode: qrCodeDataUrl,
            url: registrationUrl,
            role: 'property_owner'
        });
    } catch (error) {
        console.error('Generate property owner QR error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Generate QR code for project subscriber registration
exports.generateProjectSubscriberQR = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        const referralCode = `PROJ-${user._id.toString().slice(-8)}-${Date.now()}`;
        
        const registrationUrl = `${baseUrl}/project-subscriber/register?ref=${referralCode}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: {
                dark: '#764ba2',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            success: true,
            qrCode: qrCodeDataUrl,
            url: registrationUrl,
            role: 'project_subscriber'
        });
    } catch (error) {
        console.error('Generate project subscriber QR error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Generate QR code for property (property-specific QR)
exports.generatePropertyQR = async (req, res) => {
    try {
        const Property = require('../models/Property');
        const { propertyId } = req.params;
        
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }
        
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const propertyUrl = `${baseUrl}/properties/${property.slug}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(propertyUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: {
                dark: '#03A6A6',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            success: true,
            qrCode: qrCodeDataUrl,
            url: propertyUrl,
            propertyTitle: property.title,
            propertyPrice: property.price
        });
    } catch (error) {
        console.error('Generate property QR error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Generate QR code for hotel (hotel-specific QR)
exports.generateHotelQR = async (req, res) => {
    try {
        const Hotel = require('../models/Hotel');
        const { hotelId } = req.params;
        
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) {
            return res.status(404).json({ success: false, error: 'Hotel not found' });
        }
        
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const hotelUrl = `${baseUrl}/hotels/${hotel.slug}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(hotelUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: {
                dark: '#f5576c',
                light: '#FFFFFF'
            }
        });
        
        res.json({
            success: true,
            qrCode: qrCodeDataUrl,
            url: hotelUrl,
            hotelName: hotel.name
        });
    } catch (error) {
        console.error('Generate hotel QR error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Download QR code as PNG
exports.downloadQR = async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }
        
        const qrCodeBuffer = await QRCode.toBuffer(url, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 500,
            color: {
                dark: '#03A6A6',
                light: '#FFFFFF'
            }
        });
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'attachment; filename=qrcode.png');
        res.send(qrCodeBuffer);
    } catch (error) {
        console.error('Download QR error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get all QR codes for promoter dashboard
exports.getAllQRCodes = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        const qrCodes = [];
        
        // Promoter QR
        const promoterCode = user.promoterProfile?.referralCode || 
            `PROMO-${user._id.toString().slice(-8)}-${Date.now()}`;
        if (!user.promoterProfile?.referralCode) {
            user.promoterProfile.referralCode = promoterCode;
            await user.save();
        }
        const promoterUrl = `${baseUrl}/promoter/register?ref=${promoterCode}`;
        const promoterQR = await QRCode.toDataURL(promoterUrl, { width: 200 });
        
        // Business Partner QR (if business partner)
        if (user.userType === 'business_partner') {
            const bpCode = user.businessPartnerProfile?.referralCode || 
                `BP-${user._id.toString().slice(-8)}-${Date.now()}`;
            if (!user.businessPartnerProfile?.referralCode) {
                user.businessPartnerProfile.referralCode = bpCode;
                await user.save();
            }
            const bpUrl = `${baseUrl}/business-partner/register?ref=${bpCode}`;
            const bpQR = await QRCode.toDataURL(bpUrl, { width: 200 });
            
            qrCodes.push({
                role: 'Business Partner',
                roleKey: 'business_partner',
                qrCode: bpQR,
                url: bpUrl,
                description: 'Invite others to become Business Partners'
            });
        }
        
        // Agent QR (always available)
        const agentCode = `AGENT-${user._id.toString().slice(-8)}-${Date.now()}`;
        const agentUrl = `${baseUrl}/agent/register?ref=${agentCode}`;
        const agentQR = await QRCode.toDataURL(agentUrl, { width: 200 });
        
        qrCodes.push({
            role: 'Agent',
            roleKey: 'agent',
            qrCode: agentQR,
            url: agentUrl,
            description: 'Invite others to become Agents (₦5,000 registration fee)'
        });
        
        // Solicitor QR
        const solicitorCode = `SOL-${user._id.toString().slice(-8)}-${Date.now()}`;
        const solicitorUrl = `${baseUrl}/solicitor/register?ref=${solicitorCode}`;
        const solicitorQR = await QRCode.toDataURL(solicitorUrl, { width: 200 });
        
        qrCodes.push({
            role: 'REVAAMP Partner Solicitor',
            roleKey: 'solicitor',
            qrCode: solicitorQR,
            url: solicitorUrl,
            description: 'Invite lawyers to join as Partner Solicitors'
        });
        
        // Hectare Solicitor QR
        const hectareCode = `HSOL-${user._id.toString().slice(-8)}-${Date.now()}`;
        const hectareUrl = `${baseUrl}/hectare-solicitor/register?ref=${hectareCode}`;
        const hectareQR = await QRCode.toDataURL(hectareUrl, { width: 200 });
        
        qrCodes.push({
            role: 'Revaamp HbH Solicitor',
            roleKey: 'hectare_solicitor',
            qrCode: hectareQR,
            url: hectareUrl,
            description: 'Invite lawyers to join as HbH Solicitors'
        });
        
        // Property Owner QR
        const ownerCode = `OWNER-${user._id.toString().slice(-8)}-${Date.now()}`;
        const ownerUrl = `${baseUrl}/register?ref=${ownerCode}`;
        const ownerQR = await QRCode.toDataURL(ownerUrl, { width: 200 });
        
        qrCodes.push({
            role: 'Property Owner',
            roleKey: 'property_owner',
            qrCode: ownerQR,
            url: ownerUrl,
            description: 'Invite property owners to list their properties'
        });
        
        res.json({
            success: true,
            qrCodes: qrCodes,
            promoter: {
                role: 'Promoter',
                roleKey: 'promoter',
                qrCode: promoterQR,
                url: promoterUrl,
                description: 'Invite others to become Promoters (FREE registration)'
            }
        });
    } catch (error) {
        console.error('Get all QR codes error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};