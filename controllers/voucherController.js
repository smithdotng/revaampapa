// controllers/voucherController.js
// Revaamp Room Voucher — subscription, the subscriber check on the hotels page,
// and the hotel reservation module that makes cashback claimable.
const VoucherSubscriber = require('../models/VoucherSubscriber');
const RoomVoucherReservation = require('../models/RoomVoucherReservation');
const Hotel = require('../models/Hotel');
const User = require('../models/User');

function getBaseUrl(req) {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    return `${req.protocol}://${req.get('host')}`;
}

// Start of today, so a stay beginning today still counts as registerable
function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

// Resolve the promoter / business partner behind a ?ref= value. Promoter links
// are built as /voucher/register?ref=<userId>, but accept unique link codes too.
async function resolveReferrer(ref) {
    if (!ref) return null;
    try {
        const or = [
            { 'promoterProfile.uniqueLink': ref },
            { 'promoterProfile.uniqueLinks.code': ref },
            { 'businessPartnerProfile.uniqueLink': ref },
            { 'businessPartnerProfile.uniqueLinks.code': ref }
        ];
        if (/^[0-9a-fA-F]{24}$/.test(ref)) or.unshift({ _id: ref });
        return await User.findOne({ $or: or });
    } catch (error) {
        console.error('Resolve voucher referrer error:', error);
        return null;
    }
}

// The subscriber acting on this request: either signed in, or identified via the
// "Are you a Room Voucher Subscriber?" check on the hotels page.
async function currentSubscriber(req) {
    if (req.session.userType === 'voucher_subscriber' && req.session.userId) {
        return await VoucherSubscriber.findById(req.session.userId);
    }
    if (req.session.voucherMode && req.session.voucherMode.id) {
        return await VoucherSubscriber.findById(req.session.voucherMode.id);
    }
    return null;
}

// ============= SUBSCRIPTION =============

exports.getRegister = async (req, res) => {
    try {
        if (req.session.userType === 'voucher_subscriber') {
            req.flash('info', 'You are already a Room Voucher Subscriber');
            return res.redirect('/voucher/dashboard');
        }

        if (req.query.ref) req.session.voucherReferralCode = req.query.ref;

        res.render('voucher-register', {
            title: 'Revaamp Room Voucher Subscription - RevaampAPA',
            currentPath: '/voucher/register',
            user: req.session.userId ? { name: req.session.userName, type: req.session.userType } : null,
            referralCode: req.session.voucherReferralCode || req.query.ref || '',
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Get voucher register error:', error);
        req.flash('error', 'Error loading the subscription page');
        res.redirect('/hotels');
    }
};

exports.postRegister = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword, city, state, country, ref } = req.body;

        if (!name || !email || !phone) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('/voucher/register');
        }

        const existing = await VoucherSubscriber.findOne({ email: email.toLowerCase() });
        if (existing) {
            req.flash('error', 'That email is already subscribed. Please login instead.');
            return res.redirect('/voucher/register');
        }

        if (!password || password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/voucher/register');
        }
        if (password.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/voucher/register');
        }

        const referralCode = ref || req.session.voucherReferralCode || null;
        const referrer = await resolveReferrer(referralCode);

        const subscriber = new VoucherSubscriber({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: password,
            location: {
                city: city ? city.trim() : '',
                state: state ? state.trim() : '',
                country: country ? country.trim() : 'Nigeria'
            },
            subscription: { status: 'pending' },
            referral: {
                referredByCode: referralCode || undefined,
                referredBy: referrer ? referrer._id : undefined,
                referrerType: referrer
                    ? (referrer.userType === 'business_partner' ? 'business_partner' : 'promoter')
                    : 'none',
                commissionStatus: referrer ? 'pending' : 'not_applicable'
            }
        });

        await subscriber.save();
        delete req.session.voucherReferralCode;

        console.log(`Room Voucher subscription received: ${subscriber.email} (${subscriber.subscriberCode})`);

        try {
            const emailService = require('../utils/email');
            if (emailService.sendVoucherSubscriptionReceivedEmail) {
                await emailService.sendVoucherSubscriptionReceivedEmail(subscriber);
            }
        } catch (mailError) {
            console.error('Voucher subscription email failed:', mailError);
        }

        req.flash('success', `Subscription received. Your membership number is ${subscriber.subscriberCode}. We will activate your subscription and email you shortly — then you can start registering stays for cashback.`);
        return res.redirect('/login');

    } catch (error) {
        console.error('Voucher registration error:', error);
        if (error.code === 11000) {
            req.flash('error', 'That email is already subscribed. Please use a different email.');
        } else {
            req.flash('error', 'Subscription failed. Please try again.');
        }
        res.redirect('/voucher/register');
    }
};

// ============= SUBSCRIBER CHECK (from the hotels listing page) =============

// "Are you a Room Voucher Subscriber?" — verifies membership and turns on
// voucher mode for the browsing session so cashback rates and the
// register-interest buttons appear on listings.
exports.postCheckSubscriber = async (req, res) => {
    try {
        const { isSubscriber, email, subscriberCode } = req.body;

        if (isSubscriber !== 'yes') {
            req.flash('info', 'Room Voucher Subscribers get cashback on stays at any listed hotel. Subscribe below to start claiming.');
            return res.redirect('/voucher/register');
        }

        if (!email && !subscriberCode) {
            req.flash('error', 'Enter the email or membership number on your Room Voucher subscription.');
            return res.redirect('/hotels');
        }

        const query = [];
        if (email) query.push({ email: String(email).toLowerCase().trim() });
        if (subscriberCode) query.push({ subscriberCode: String(subscriberCode).toUpperCase().trim() });

        const subscriber = await VoucherSubscriber.findOne({ $or: query });

        if (!subscriber) {
            req.flash('error', 'We could not find that Room Voucher subscription. Check the details, or subscribe to start earning cashback.');
            return res.redirect('/hotels');
        }

        if (!subscriber.hasActiveSubscription()) {
            req.session.voucherMode = null;
            req.flash('error', `Your Room Voucher subscription is ${subscriber.subscription.status}. It must be active before you can register a stay for cashback — please contact info@revaampapa.com.`);
            return res.redirect('/hotels');
        }

        req.session.voucherMode = {
            id: subscriber._id.toString(),
            code: subscriber.subscriberCode,
            name: subscriber.name
        };

        req.flash('success', `Welcome back, ${subscriber.name}. Cashback rates are now shown on every listing — register your stay on a hotel to claim.`);
        res.redirect('/hotels?voucher=1');
    } catch (error) {
        console.error('Voucher subscriber check error:', error);
        req.flash('error', 'Could not verify your subscription. Please try again.');
        res.redirect('/hotels');
    }
};

exports.postExitVoucherMode = (req, res) => {
    req.session.voucherMode = null;
    res.redirect('/hotels');
};

// ============= RESERVATION MODULE =============

// Registering interest in a specific hotel. This is what makes cashback claimable.
exports.getReserve = async (req, res) => {
    try {
        const subscriber = await currentSubscriber(req);

        if (!subscriber) {
            req.flash('error', 'Confirm your Room Voucher membership before registering a stay.');
            return res.redirect('/hotels');
        }

        if (!subscriber.hasActiveSubscription()) {
            req.flash('error', 'Your Room Voucher subscription is not active, so cashback cannot be registered yet.');
            return res.redirect('/hotels');
        }

        const hotel = await Hotel.findOne({ slug: req.params.slug, isActive: true });
        if (!hotel) {
            req.flash('error', 'Hotel not found');
            return res.redirect('/hotels');
        }

        res.render('voucher/reserve', {
            title: `Register a Stay — ${hotel.name} - RevaampAPA`,
            hotel: hotel,
            subscriber: subscriber,
            user: req.session.userId ? { name: req.session.userName, type: req.session.userType } : null,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Get voucher reserve error:', error);
        req.flash('error', 'Error loading the reservation form');
        res.redirect('/hotels');
    }
};

exports.postReserve = async (req, res) => {
    const slug = req.params.slug;
    try {
        const subscriber = await currentSubscriber(req);

        if (!subscriber || !subscriber.hasActiveSubscription()) {
            req.flash('error', 'An active Room Voucher subscription is required to register a stay.');
            return res.redirect('/hotels');
        }

        const hotel = await Hotel.findOne({ slug: slug, isActive: true });
        if (!hotel) {
            req.flash('error', 'Hotel not found');
            return res.redirect('/hotels');
        }

        const {
            guestName, guestEmail, guestPhone, roomType,
            checkInDate, checkOutDate, numberOfRooms, numberOfGuests,
            roomRate, specialRequests
        } = req.body;

        if (!guestName || !checkInDate || !checkOutDate) {
            req.flash('error', 'Guest name and both dates are required');
            return res.redirect(`/voucher/reserve/${slug}`);
        }

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        if (isNaN(checkIn) || isNaN(checkOut)) {
            req.flash('error', 'Please enter valid dates');
            return res.redirect(`/voucher/reserve/${slug}`);
        }
        if (checkOut <= checkIn) {
            req.flash('error', 'Check-out must be after check-in');
            return res.redirect(`/voucher/reserve/${slug}`);
        }
        // The whole point of the programme: interest must be registered before
        // the stay, otherwise there is nothing to verify a claim against.
        if (checkIn < startOfToday()) {
            req.flash('error', 'A stay must be registered before check-in — cashback cannot be claimed retroactively.');
            return res.redirect(`/voucher/reserve/${slug}`);
        }

        const reservation = new RoomVoucherReservation({
            subscriber: subscriber._id,
            hotel: hotel._id,
            hotelName: hotel.name,
            guestName: guestName.trim(),
            guestEmail: (guestEmail || subscriber.email || '').trim(),
            guestPhone: (guestPhone || subscriber.phone || '').trim(),
            roomType: roomType ? roomType.trim() : '',
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numberOfRooms: parseInt(numberOfRooms, 10) || 1,
            numberOfGuests: parseInt(numberOfGuests, 10) || 1,
            roomRate: parseFloat(roomRate) || 0,
            voucherDiscountRate: hotel.voucherDiscountRate || 0,
            specialRequests: specialRequests ? specialRequests.trim() : '',
            status: 'registered',
            cashbackStatus: 'pending'
        });

        await reservation.save();

        console.log(`Room Voucher stay registered: ${reservation.reference} — ${subscriber.email} @ ${hotel.name}`);

        try {
            const emailService = require('../utils/email');
            if (emailService.sendVoucherReservationRegisteredEmail) {
                await emailService.sendVoucherReservationRegisteredEmail(subscriber, reservation, hotel);
            }
        } catch (mailError) {
            console.error('Voucher reservation email failed:', mailError);
        }

        req.flash('success', `Stay registered at ${hotel.name}. Reference ${reservation.reference}. Your cashback is calculated once the stay is confirmed.`);

        if (req.session.userType === 'voucher_subscriber') {
            return res.redirect(`/voucher/reservations/${reservation._id}`);
        }
        return res.redirect('/hotels?voucher=1');

    } catch (error) {
        console.error('Post voucher reserve error:', error);
        req.flash('error', 'Could not register the stay. Please try again.');
        res.redirect(`/voucher/reserve/${slug}`);
    }
};

// ============= SUBSCRIBER DASHBOARD =============

function summarise(reservations) {
    const sum = (list, f) => list.reduce((t, r) => t + (f(r) || 0), 0);
    const live = reservations.filter(r => r.status !== 'cancelled' && r.status !== 'no_show');
    return {
        total: reservations.length,
        upcoming: reservations.filter(r =>
            ['registered', 'confirmed'].includes(r.status) && new Date(r.checkInDate) >= startOfToday()).length,
        nights: sum(live, r => r.nights),
        cashbackPending: sum(live.filter(r => r.cashbackStatus === 'pending'), r => r.cashbackAmount),
        cashbackApproved: sum(live.filter(r => r.cashbackStatus === 'approved'), r => r.cashbackAmount),
        cashbackPaid: sum(reservations.filter(r => r.cashbackStatus === 'paid'), r => r.cashbackAmount)
    };
}

exports.getDashboard = async (req, res) => {
    try {
        const subscriber = await VoucherSubscriber.findById(req.session.userId);
        if (!subscriber) {
            req.flash('error', 'Subscriber account not found');
            return res.redirect('/login');
        }

        const reservations = await RoomVoucherReservation.find({ subscriber: subscriber._id })
            .populate('hotel', 'name slug location voucherDiscountRate')
            .sort('-createdAt');

        res.render('voucher/dashboard', {
            title: 'Room Voucher Dashboard - RevaampAPA',
            user: subscriber,
            reservations: reservations.slice(0, 10),
            stats: summarise(reservations),
            baseUrl: getBaseUrl(req),
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Voucher dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
};

exports.getReservations = async (req, res) => {
    try {
        const subscriber = await VoucherSubscriber.findById(req.session.userId);
        if (!subscriber) {
            req.flash('error', 'Subscriber account not found');
            return res.redirect('/login');
        }

        const filter = { subscriber: subscriber._id };
        if (req.query.status) filter.status = req.query.status;
        if (req.query.cashback) filter.cashbackStatus = req.query.cashback;

        const reservations = await RoomVoucherReservation.find(filter)
            .populate('hotel', 'name slug location')
            .sort('-createdAt');

        const all = await RoomVoucherReservation.find({ subscriber: subscriber._id });

        res.render('voucher/reservations', {
            title: 'My Reservations - RevaampAPA',
            user: subscriber,
            reservations: reservations,
            stats: summarise(all),
            filters: req.query,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Voucher reservations error:', error);
        req.flash('error', 'Error loading reservations');
        res.redirect('/voucher/dashboard');
    }
};

exports.getReservationDetail = async (req, res) => {
    try {
        const subscriber = await VoucherSubscriber.findById(req.session.userId);
        if (!subscriber) {
            req.flash('error', 'Subscriber account not found');
            return res.redirect('/login');
        }

        const reservation = await RoomVoucherReservation.findOne({
            _id: req.params.id,
            subscriber: subscriber._id
        }).populate('hotel', 'name slug location contactInfo voucherDiscountRate');

        if (!reservation) {
            req.flash('error', 'Reservation not found');
            return res.redirect('/voucher/reservations');
        }

        res.render('voucher/reservation-detail', {
            title: `${reservation.reference} - RevaampAPA`,
            user: subscriber,
            reservation: reservation,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Voucher reservation detail error:', error);
        req.flash('error', 'Error loading reservation');
        res.redirect('/voucher/reservations');
    }
};

exports.postCancelReservation = async (req, res) => {
    try {
        const subscriber = await VoucherSubscriber.findById(req.session.userId);
        if (!subscriber) return res.status(401).json({ error: 'Not signed in' });

        const reservation = await RoomVoucherReservation.findOne({
            _id: req.params.id,
            subscriber: subscriber._id
        });

        if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

        if (!['registered', 'confirmed'].includes(reservation.status)) {
            return res.status(400).json({ error: 'This reservation can no longer be cancelled' });
        }

        reservation.status = 'cancelled';
        reservation.cancelledAt = new Date();
        await reservation.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Cancel voucher reservation error:', error);
        res.status(500).json({ error: 'Error cancelling reservation' });
    }
};

// ============= SETTINGS =============

exports.getSettings = async (req, res) => {
    try {
        const subscriber = await VoucherSubscriber.findById(req.session.userId);
        if (!subscriber) {
            req.flash('error', 'Subscriber account not found');
            return res.redirect('/login');
        }

        res.render('voucher/settings', {
            title: 'Account Settings - RevaampAPA',
            user: subscriber,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Voucher settings error:', error);
        req.flash('error', 'Error loading settings');
        res.redirect('/voucher/dashboard');
    }
};

exports.postSettings = async (req, res) => {
    try {
        const subscriber = await VoucherSubscriber.findById(req.session.userId);
        if (!subscriber) {
            req.flash('error', 'Subscriber account not found');
            return res.redirect('/login');
        }

        const { name, phone, city, state, country } = req.body;
        if (name) subscriber.name = name.trim();
        if (phone) subscriber.phone = phone.trim();
        subscriber.location = {
            city: city !== undefined ? city.trim() : subscriber.location?.city,
            state: state !== undefined ? state.trim() : subscriber.location?.state,
            country: country !== undefined ? country.trim() : (subscriber.location?.country || 'Nigeria')
        };

        await subscriber.save();
        req.session.userName = subscriber.name;

        req.flash('success', 'Details updated');
        res.redirect('/voucher/settings');
    } catch (error) {
        console.error('Update voucher settings error:', error);
        req.flash('error', 'Error updating settings');
        res.redirect('/voucher/settings');
    }
};

exports.postChangePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const subscriber = await VoucherSubscriber.findById(req.session.userId);
        if (!subscriber) {
            req.flash('error', 'Subscriber account not found');
            return res.redirect('/login');
        }

        const isMatch = await subscriber.comparePassword(currentPassword);
        if (!isMatch) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/voucher/settings');
        }
        if (!newPassword || newPassword.length < 8) {
            req.flash('error', 'New password must be at least 8 characters long');
            return res.redirect('/voucher/settings');
        }
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/voucher/settings');
        }

        subscriber.password = newPassword;
        await subscriber.save();

        req.flash('success', 'Password changed successfully');
        res.redirect('/voucher/settings');
    } catch (error) {
        console.error('Change voucher password error:', error);
        req.flash('error', 'Error changing password');
        res.redirect('/voucher/settings');
    }
};
