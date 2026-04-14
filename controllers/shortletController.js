// controllers/shortletController.js
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const BlockedDate = require('../models/BlockedDate');
const User = require('../models/User');

// Get shortlet availability calendar
exports.getAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { month, year } = req.query;
        
        const property = await Property.findById(id);
        if (!property || property.propertyType !== 'shortlet') {
            return res.status(404).json({ error: 'Shortlet not found' });
        }
        
        // Get all bookings for this property
        const bookings = await Booking.find({
            property: id,
            status: { $in: ['confirmed', 'checked_in'] }
        });
        
        // Get blocked dates
        const blockedDates = await BlockedDate.find({
            property: id,
            endDate: { $gte: new Date() }
        });
        
        // Generate calendar data
        const calendar = generateCalendar(month, year, bookings, blockedDates);
        
        res.json({
            success: true,
            calendar,
            pricing: {
                nightlyRate: property.price,
                weekendRate: property.shortletDetails?.weekendRate,
                cleaningFee: property.shortletDetails?.cleaningFee,
                securityDeposit: property.shortletDetails?.securityDeposit,
                minimumStay: property.shortletDetails?.minimumStay,
                maximumStay: property.shortletDetails?.maximumStay
            }
        });
    } catch (error) {
        console.error('Get availability error:', error);
        res.status(500).json({ error: 'Error loading availability' });
    }
};

// Check specific date range availability
exports.checkAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { checkIn, checkOut, guests } = req.query;
        
        const property = await Property.findById(id);
        if (!property || property.propertyType !== 'shortlet') {
            return res.status(404).json({ error: 'Shortlet not found' });
        }
        
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        
        // Check minimum/maximum stay
        if (nights < (property.shortletDetails?.minimumStay || 1)) {
            return res.json({
                available: false,
                reason: `Minimum stay is ${property.shortletDetails?.minimumStay} nights`
            });
        }
        
        if (nights > (property.shortletDetails?.maximumStay || 30)) {
            return res.json({
                available: false,
                reason: `Maximum stay is ${property.shortletDetails?.maximumStay} nights`
            });
        }
        
        // Check guest count
        if (guests > (property.shortletDetails?.maxGuests || 2)) {
            return res.json({
                available: false,
                reason: `Maximum ${property.shortletDetails?.maxGuests} guests allowed`
            });
        }
        
        // Check availability
        const isAvailable = await Booking.checkAvailability(id, checkInDate, checkOutDate);
        
        if (!isAvailable) {
            return res.json({
                available: false,
                reason: 'Property is not available for selected dates'
            });
        }
        
        // Check blocked dates
        const isBlocked = await BlockedDate.findOne({
            property: id,
            startDate: { $lte: checkOutDate },
            endDate: { $gte: checkInDate }
        });
        
        if (isBlocked) {
            return res.json({
                available: false,
                reason: 'Property is blocked for selected dates'
            });
        }
        
        // Calculate price
        const priceBreakdown = property.calculatePrice(checkInDate, checkOutDate, guests);
        
        res.json({
            available: true,
            priceBreakdown,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            nights
        });
    } catch (error) {
        console.error('Check availability error:', error);
        res.status(500).json({ error: 'Error checking availability' });
    }
};

// Create booking
exports.createBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            guestName, guestEmail, guestPhone, numberOfGuests,
            checkIn, checkOut, specialRequests,
            paymentMethod, referralCode
        } = req.body;
        
        const property = await Property.findById(id);
        if (!property || property.propertyType !== 'shortlet') {
            req.flash('error', 'Shortlet not found');
            return res.redirect('/properties');
        }
        
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        
        // Validate availability
        const isAvailable = await Booking.checkAvailability(id, checkInDate, checkOutDate);
        if (!isAvailable) {
            req.flash('error', 'Property is not available for selected dates');
            return res.redirect(`/properties/${property.slug}`);
        }
        
        // Calculate price
        const priceBreakdown = property.calculatePrice(checkInDate, checkOutDate, numberOfGuests);
        
        // Check for referral
        let referredBy = null;
        if (referralCode) {
            const referringAgent = await User.findOne({
                'agentProfile.uniqueLink': referralCode,
                userType: 'agent',
                'agentProfile.isApproved': true
            });
            if (referringAgent) {
                referredBy = referringAgent._id;
            }
        }
        
        // Create booking
        const booking = new Booking({
            property: id,
            guest: {
                name: guestName,
                email: guestEmail,
                phone: guestPhone,
                numberOfGuests
            },
            dates: {
                checkIn: checkInDate,
                checkOut: checkOutDate,
                nights: priceBreakdown.nights
            },
            pricing: {
                nightlyRate: property.price,
                weekendRate: property.shortletDetails?.weekendRate,
                subtotal: priceBreakdown.subtotal,
                cleaningFee: priceBreakdown.cleaningFee,
                securityDeposit: priceBreakdown.securityDeposit,
                discount: priceBreakdown.discounts.weekly || priceBreakdown.discounts.monthly || 0,
                discountType: priceBreakdown.nights >= 28 ? 'monthly' : (priceBreakdown.nights >= 7 ? 'weekly' : null),
                total: priceBreakdown.total
            },
            payment: {
                method: paymentMethod,
                status: 'pending'
            },
            specialRequests,
            referredBy
        });
        
        await booking.save();
        
        // If agent referred, increment their stats
        if (referredBy) {
            await User.findByIdAndUpdate(referredBy, {
                $inc: { 'referralStats.totalClicks': 1 }
            });
        }
        
        req.flash('success', 'Booking created successfully! Please complete payment.');
        res.redirect(`/bookings/${booking.bookingReference}/payment`);
    } catch (error) {
        console.error('Create booking error:', error);
        req.flash('error', 'Error creating booking');
        res.redirect(`/properties/${req.params.id}`);
    }
};

// Get booking details
exports.getBooking = async (req, res) => {
    try {
        const { reference } = req.params;
        
        const booking = await Booking.findOne({ bookingReference: reference })
            .populate('property')
            .populate('referredBy', 'name');
        
        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/');
        }
        
        res.render('booking-detail', {
            title: `Booking ${reference}`,
            booking
        });
    } catch (error) {
        console.error('Get booking error:', error);
        req.flash('error', 'Error loading booking');
        res.redirect('/');
    }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
    try {
        const { reference } = req.params;
        const { reason } = req.body;
        
        const booking = await Booking.findOne({ bookingReference: reference });
        
        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/');
        }
        
        // Check cancellation policy
        const now = new Date();
        const checkIn = booking.dates.checkIn;
        const daysUntilCheckIn = Math.ceil((checkIn - now) / (1000 * 60 * 60 * 24));
        
        let refundAmount = 0;
        const policy = booking.property?.shortletDetails?.cancellationPolicy || 'moderate';
        
        if (policy === 'flexible') {
            // Full refund if cancelled 24h before check-in
            if (daysUntilCheckIn >= 1) {
                refundAmount = booking.pricing.total;
            }
        } else if (policy === 'moderate') {
            // Full refund 5 days before, 50% refund 3 days before
            if (daysUntilCheckIn >= 5) {
                refundAmount = booking.pricing.total;
            } else if (daysUntilCheckIn >= 3) {
                refundAmount = booking.pricing.total * 0.5;
            }
        } else if (policy === 'strict') {
            // 50% refund up to 7 days before
            if (daysUntilCheckIn >= 7) {
                refundAmount = booking.pricing.total * 0.5;
            }
        }
        
        booking.status = 'cancelled';
        booking.cancellation = {
            cancelledAt: now,
            reason,
            refundAmount
        };
        
        await booking.save();
        
        req.flash('success', `Booking cancelled successfully. Refund amount: ₦${refundAmount.toLocaleString()}`);
        res.redirect(`/bookings/${reference}`);
    } catch (error) {
        console.error('Cancel booking error:', error);
        req.flash('error', 'Error cancelling booking');
        res.redirect(`/bookings/${req.params.reference}`);
    }
};

// Owner: Manage shortlet settings
exports.updateShortletSettings = async (req, res) => {
    try {
        const { id } = req.params;
        
        const property = await Property.findById(id);
        if (!property || property.owner.toString() !== req.session.userId) {
            req.flash('error', 'Unauthorized');
            return res.redirect('/dashboard');
        }
        
        const {
            minimumStay, maximumStay, checkInTime, checkOutTime,
            maxGuests, bedrooms, bathrooms, amenities,
            houseRules, cancellationPolicy, cleaningFee,
            securityDeposit, weekendRate, weeklyDiscount,
            monthlyDiscount, earlyBirdDiscount, earlyBirdDays,
            lastMinuteDiscount, lastMinuteDays
        } = req.body;
        
        property.shortletDetails = {
            isAvailable: true,
            minimumStay: minimumStay || 1,
            maximumStay: maximumStay || 30,
            checkInTime: checkInTime || '14:00',
            checkOutTime: checkOutTime || '11:00',
            maxGuests: maxGuests || 2,
            bedrooms: bedrooms || property.features?.bedrooms,
            bathrooms: bathrooms || property.features?.bathrooms,
            amenities: Array.isArray(amenities) ? amenities : [amenities].filter(Boolean),
            houseRules: Array.isArray(houseRules) ? houseRules : [houseRules].filter(Boolean),
            cancellationPolicy: cancellationPolicy || 'moderate',
            cleaningFee: cleaningFee || 0,
            securityDeposit: securityDeposit || 0,
            weekendRate: weekendRate || null,
            weeklyDiscount: weeklyDiscount || 0,
            monthlyDiscount: monthlyDiscount || 0,
            earlyBirdDiscount: earlyBirdDiscount || 0,
            earlyBirdDays: earlyBirdDays || 0,
            lastMinuteDiscount: lastMinuteDiscount || 0,
            lastMinuteDays: lastMinuteDays || 0
        };
        
        await property.save();
        
        req.flash('success', 'Shortlet settings updated successfully');
        res.redirect(`/properties/${id}/edit`);
    } catch (error) {
        console.error('Update shortlet settings error:', error);
        req.flash('error', 'Error updating settings');
        res.redirect(`/properties/${req.params.id}/edit`);
    }
};

// Owner: Block dates
exports.blockDates = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, reason, notes } = req.body;
        
        const property = await Property.findById(id);
        if (!property || property.owner.toString() !== req.session.userId) {
            req.flash('error', 'Unauthorized');
            return res.redirect('/dashboard');
        }
        
        const blockedDate = new BlockedDate({
            property: id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            notes,
            createdBy: req.session.userId
        });
        
        await blockedDate.save();
        
        req.flash('success', 'Dates blocked successfully');
        res.redirect(`/properties/${id}/calendar`);
    } catch (error) {
        console.error('Block dates error:', error);
        req.flash('error', 'Error blocking dates');
        res.redirect(`/properties/${req.params.id}/calendar`);
    }
};

// Owner: Get bookings for a property
exports.getPropertyBookings = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.query;
        
        const property = await Property.findById(id);
        if (!property || property.owner.toString() !== req.session.userId) {
            req.flash('error', 'Unauthorized');
            return res.redirect('/dashboard');
        }
        
        let query = { property: id };
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const bookings = await Booking.find(query)
            .sort('-createdAt');
        
        res.render('property-bookings', {
            title: `Bookings - ${property.title}`,
            property,
            bookings,
            currentFilter: status || 'all'
        });
    } catch (error) {
        console.error('Get property bookings error:', error);
        req.flash('error', 'Error loading bookings');
        res.redirect('/dashboard');
    }
};

// Helper function to generate calendar
function generateCalendar(month, year, bookings, blockedDates) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday
    
    const calendar = [];
    
    // Create date objects for each day
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Check if booked
        const isBooked = bookings.some(booking => {
            const checkIn = new Date(booking.dates.checkIn);
            const checkOut = new Date(booking.dates.checkOut);
            return date >= checkIn && date < checkOut;
        });
        
        // Check if blocked
        const isBlocked = blockedDates.some(blocked => {
            const start = new Date(blocked.startDate);
            const end = new Date(blocked.endDate);
            return date >= start && date <= end;
        });
        
        // Check if past date
        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
        
        let status = 'available';
        if (isPast) status = 'past';
        else if (isBlocked) status = 'blocked';
        else if (isBooked) status = 'booked';
        
        calendar.push({
            date: dateStr,
            day: i,
            status,
            dayOfWeek: date.getDay()
        });
    }
    
    return {
        year,
        month,
        daysInMonth,
        startingDay,
        calendar
    };
}