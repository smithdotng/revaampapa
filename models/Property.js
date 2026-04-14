// models/Property.js
const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    propertyType: {
        type: String,
        enum: ['shortlet', 'land', 'building', 'shop', 'business_complex'],
        required: true
    },
    transactionType: {
        type: String,
        enum: ['rent', 'sale', 'lease'],
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    priceNegotiable: {
        type: Boolean,
        default: false
    },
    location: {
        address: String,
        city: String,
        state: String,
        lga: String,
        landmark: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    features: {
        bedrooms: Number,
        bathrooms: Number,
        toilets: Number,
        parkingSpaces: Number,
        floorArea: Number,
        landArea: Number,
        furnished: Boolean,
        serviced: Boolean,
        security: Boolean,
        powerSupply: Boolean,
        borehole: Boolean
    },
    images: [{
        url: String,
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],
    videoUrl: String,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerType: {
        type: String,
        enum: ['realtor', 'admin'],
        default: 'realtor'
    },
    status: {
        type: String,
        enum: ['available', 'pending', 'sold', 'rented', 'unavailable'],
        default: 'available'
    },
    views: {
        type: Number,
        default: 0
    },
    featured: {
        type: Boolean,
        default: false
    },
    featuredExpiry: Date,
    agencyFee: {
        type: Number,
        required: true,
        default: function() {
            // Default 10% of price as agency fee
            return this.price * 0.1;
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },

    // Shortlet specific fields
    shortletDetails: {
        isAvailable: {
            type: Boolean,
            default: true
        },
        minimumStay: {
            type: Number, // in nights
            default: 1
        },
        maximumStay: {
            type: Number, // in nights
            default: 30
        },
        checkInTime: {
            type: String,
            default: '14:00'
        },
        checkOutTime: {
            type: String,
            default: '11:00'
        },
        maxGuests: {
            type: Number,
            default: 2
        },
        bedrooms: Number,
        bathrooms: Number,
        amenities: [{
            type: String,
            enum: ['wifi', 'tv', 'air conditioning', 'heating', 'kitchen', 'washer', 
                   'dryer', 'pool', 'gym', 'parking', 'elevator', 'pet friendly', 
                   'smoking allowed', 'workspace', 'balcony', 'security']
        }],
        houseRules: [{
            type: String,
            enum: ['no smoking', 'no pets', 'no parties', 'no loud music', 
                   'no visitors', 'quiet hours', 'no shoes indoors']
        }],
        cancellationPolicy: {
            type: String,
            enum: ['flexible', 'moderate', 'strict', 'super strict'],
            default: 'moderate'
        },
        cleaningFee: {
            type: Number,
            default: 0
        },
        securityDeposit: {
            type: Number,
            default: 0
        },
        weekendRate: {
            type: Number, // Different rate for weekends (Fri-Sun)
            default: null
        },
        weeklyDiscount: {
            type: Number, // Percentage discount for weekly booking
            default: 0
        },
        monthlyDiscount: {
            type: Number, // Percentage discount for monthly booking
            default: 0
        },
        earlyBirdDiscount: {
            type: Number, // Percentage discount for booking X days in advance
            default: 0
        },
        earlyBirdDays: {
            type: Number, // Days in advance for early bird discount
            default: 0
        },
        lastMinuteDiscount: {
            type: Number, // Percentage discount for last minute booking
            default: 0
        },
        lastMinuteDays: {
            type: Number, // Days before check-in for last minute discount
            default: 0
        }
    
    },

    // Add these fields to your propertySchema
listingTier: {
    type: String,
    enum: ['free', 'standard', 'premium'],
    default: 'free'
},
commissionSplit: {
    agent: {
        type: Number,
        default: 70
    },
    promoter: {
        type: Number,
        default: 10
    },
    platform: {
        type: Number,
        default: 20
    }
},
tierExpiry: {
    type: Date
}

});

// Update timestamp on save
propertySchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Calculate price for shortlet bookings
propertySchema.methods.calculatePrice = function(checkIn, checkOut, guests = 2) {
    // Only applicable for shortlets
    if (this.propertyType !== 'shortlet') {
        return {
            nights: 0,
            nightlyRate: this.price,
            weekendRate: null,
            subtotal: this.price,
            cleaningFee: 0,
            securityDeposit: 0,
            total: this.price,
            discounts: {
                weekly: 0,
                monthly: 0
            }
        };
    }
    
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    let totalPrice = 0;
    
    // Calculate price for each night considering weekend rates
    for (let i = 0; i < nights; i++) {
        const currentDate = new Date(checkIn);
        currentDate.setDate(currentDate.getDate() + i);
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Check if it's weekend (Fri = 5, Sat = 6)
        if ((dayOfWeek === 5 || dayOfWeek === 6) && this.shortletDetails.weekendRate) {
            totalPrice += this.shortletDetails.weekendRate;
        } else {
            totalPrice += this.price;
        }
    }
    
    // Apply discounts
    let weeklyDiscountApplied = 0;
    let monthlyDiscountApplied = 0;
    
    if (nights >= 28 && this.shortletDetails.monthlyDiscount > 0) {
        monthlyDiscountApplied = this.shortletDetails.monthlyDiscount;
        totalPrice *= (1 - this.shortletDetails.monthlyDiscount / 100);
    } else if (nights >= 7 && this.shortletDetails.weeklyDiscount > 0) {
        weeklyDiscountApplied = this.shortletDetails.weeklyDiscount;
        totalPrice *= (1 - this.shortletDetails.weeklyDiscount / 100);
    }
    
    // Apply early bird discount if applicable
    const today = new Date();
    const daysUntilCheckIn = Math.ceil((checkIn - today) / (1000 * 60 * 60 * 24));
    
    if (this.shortletDetails.earlyBirdDiscount > 0 && 
        daysUntilCheckIn >= this.shortletDetails.earlyBirdDays) {
        totalPrice *= (1 - this.shortletDetails.earlyBirdDiscount / 100);
    }
    
    // Apply last minute discount if applicable
    if (this.shortletDetails.lastMinuteDiscount > 0 && 
        daysUntilCheckIn <= this.shortletDetails.lastMinuteDays) {
        totalPrice *= (1 - this.shortletDetails.lastMinuteDiscount / 100);
    }
    
    // Calculate subtotal (before cleaning fee and security deposit)
    const subtotal = totalPrice;
    
    // Add cleaning fee
    if (this.shortletDetails.cleaningFee) {
        totalPrice += this.shortletDetails.cleaningFee;
    }
    
    // Security deposit (refundable, not included in total paid)
    const securityDeposit = this.shortletDetails.securityDeposit || 0;
    
    return {
        nights,
        nightlyRate: this.price,
        weekendRate: this.shortletDetails.weekendRate,
        subtotal,
        cleaningFee: this.shortletDetails.cleaningFee || 0,
        securityDeposit,
        total: totalPrice,
        discounts: {
            weekly: weeklyDiscountApplied,
            monthly: monthlyDiscountApplied,
            earlyBird: daysUntilCheckIn >= this.shortletDetails.earlyBirdDays ? this.shortletDetails.earlyBirdDiscount : 0,
            lastMinute: daysUntilCheckIn <= this.shortletDetails.lastMinuteDays ? this.shortletDetails.lastMinuteDiscount : 0
        },
        paymentDue: totalPrice, // Amount guest pays
        depositHeld: securityDeposit // Amount held as security
    };
};

// Method to check if property is available for dates
propertySchema.methods.isAvailableForDates = async function(checkIn, checkOut) {
    const Booking = mongoose.model('Booking');
    const BlockedDate = mongoose.model('BlockedDate');
    
    // Check for existing bookings
    const existingBooking = await Booking.findOne({
        property: this._id,
        status: { $in: ['confirmed', 'checked_in'] },
        $or: [
            {
                'dates.checkIn': { $lt: checkOut },
                'dates.checkOut': { $gt: checkIn }
            }
        ]
    });
    
    if (existingBooking) return false;
    
    // Check for blocked dates
    const blockedDate = await BlockedDate.findOne({
        property: this._id,
        startDate: { $lte: checkOut },
        endDate: { $gte: checkIn }
    });
    
    if (blockedDate) return false;
    
    return true;
};

module.exports = mongoose.model('Property', propertySchema);