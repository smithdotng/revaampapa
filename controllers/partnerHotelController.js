// controllers/partnerHotelController.js
// Revaamp Partner Hotel — registration, listing management and performance
// dashboard for hotels partnering with Revaamp for marketing & promotion.
const PartnerHotel = require('../models/PartnerHotel');
const Hotel = require('../models/Hotel');
const HotelClick = require('../models/HotelClick');
const HotelBooking = require('../models/HotelBooking');
const User = require('../models/User');

// Helper function to get base URL
function getBaseUrl(req) {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    return `${req.protocol}://${req.get('host')}`;
}

// Normalise the amenities field (checkbox group -> array)
function toArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

// Build roomTypes array from parallel form inputs
function parseRoomTypes(body) {
    const names = toArray(body.roomTypeName);
    const prices = toArray(body.roomTypePrice);
    const counts = toArray(body.roomTypeCount);

    return names
        .map((name, i) => ({
            name: (name || '').trim(),
            price: parseFloat(prices[i]) || 0,
            totalRooms: parseInt(counts[i], 10) || 0
        }))
        .filter(rt => rt.name);
}

// Resolve the promoter / business partner who onboarded this hotel, if any
async function resolveReferrer(code) {
    if (!code) return null;
    try {
        return await User.findOne({
            $or: [
                { 'promoterProfile.uniqueLink': code },
                { 'promoterProfile.uniqueLinks.code': code },
                { 'businessPartnerProfile.uniqueLink': code },
                { 'businessPartnerProfile.uniqueLinks.code': code }
            ]
        });
    } catch (error) {
        console.error('Resolve hotel referrer error:', error);
        return null;
    }
}

// ============= REGISTRATION =============

// Registration page
exports.getRegister = async (req, res) => {
    try {
        // Remember who referred this hotel so the promoter gets credit
        if (req.query.ref) {
            req.session.hotelReferralCode = req.query.ref;
        }

        res.render('partner-hotel-register', {
            title: 'Become a Revaamp Partner Hotel - RevaampAPA',
            currentPath: '/partner-hotel/register',
            user: req.session.userId ? { name: req.session.userName, type: req.session.userType } : null,
            referralCode: req.session.hotelReferralCode || req.query.ref || '',
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Get partner hotel register error:', error);
        req.flash('error', 'Error loading registration page');
        res.redirect('/hotels');
    }
};

// Registration handler
exports.postRegister = async (req, res) => {
    try {
        const {
            name, email, phone, position, password, confirmPassword,
            hotelName, description, starRating, numberOfRooms, yearEstablished, website,
            address, city, state, country, amenities, ref
        } = req.body;

        // ---- Validation ----
        if (!name || !email || !phone || !hotelName || !description || !city || !state) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('/partner-hotel/register');
        }

        const existing = await PartnerHotel.findOne({ email: email.toLowerCase() });
        if (existing) {
            req.flash('error', 'Email already registered. Please login instead.');
            return res.redirect('/partner-hotel/register');
        }

        if (!password || !confirmPassword) {
            req.flash('error', 'Password is required');
            return res.redirect('/partner-hotel/register');
        }
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/partner-hotel/register');
        }
        if (password.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/partner-hotel/register');
        }

        // ---- Files ----
        const images = [];
        const docs = { cacCertificate: '', hotelLicence: '', ratePolicy: '' };

        if (req.files) {
            (req.files.images || []).forEach((file, index) => {
                images.push({
                    url: '/uploads/hotels/' + file.filename,
                    isPrimary: index === 0
                });
            });
            ['cacCertificate', 'hotelLicence', 'ratePolicy'].forEach(field => {
                if (req.files[field] && req.files[field][0]) {
                    docs[field] = '/uploads/documents/' + req.files[field][0].filename;
                }
            });
        }

        // ---- Referral credit ----
        const referralCode = ref || req.session.hotelReferralCode || null;
        const referrer = await resolveReferrer(referralCode);

        const partnerHotel = new PartnerHotel({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            position: position ? position.trim() : '',
            password: password,
            hotelName: hotelName.trim(),
            description: description.trim(),
            starRating: parseFloat(starRating) || 0,
            numberOfRooms: parseInt(numberOfRooms, 10) || 0,
            yearEstablished: parseInt(yearEstablished, 10) || undefined,
            website: website ? website.trim() : '',
            location: {
                address: address ? address.trim() : '',
                city: city ? city.trim() : '',
                state: state ? state.trim() : '',
                country: country ? country.trim() : 'Nigeria'
            },
            roomTypes: parseRoomTypes(req.body),
            amenities: toArray(amenities),
            images: images,
            cacCertificate: { url: docs.cacCertificate, filename: req.files?.cacCertificate?.[0]?.filename || '', uploadedAt: new Date() },
            hotelLicence: { url: docs.hotelLicence, filename: req.files?.hotelLicence?.[0]?.filename || '', uploadedAt: new Date() },
            ratePolicy: { url: docs.ratePolicy, filename: req.files?.ratePolicy?.[0]?.filename || '', uploadedAt: new Date() },
            partnerProfile: {
                isActive: false,
                mandateAccepted: true,
                mandateAcceptedAt: new Date(),
                referredByCode: referralCode || undefined,
                onboardedByPromoter: referrer ? referrer._id : undefined
            }
        });

        await partnerHotel.save();
        delete req.session.hotelReferralCode;

        console.log(`✅ Revaamp Partner Hotel registered: ${partnerHotel.hotelName} (${partnerHotel.email})`);

        req.flash('success', '✅ Application submitted! Our team will review your hotel and publish your listing once approved. We will email you at the address you provided as soon as a decision is made.');
        return res.redirect('/login');

    } catch (error) {
        console.error('Partner hotel registration error:', error);
        if (error.code === 11000) {
            req.flash('error', 'Email already registered. Please use a different email.');
        } else {
            req.flash('error', 'Registration failed. Please try again.');
        }
        res.redirect('/partner-hotel/register');
    }
};

// ============= NO DASHBOARD BY DESIGN =============
// Partner hotels do not get an account area. Once superadmin approves the
// application, the hotel is notified by email (see
// utils/email.js -> sendPartnerHotelApprovedEmail) and everything else is
// handled by the Revaamp team. Login is blocked for userType 'partner_hotel'.
