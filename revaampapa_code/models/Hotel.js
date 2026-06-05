const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        sparse: true
    },
    description: {
        type: String,
        required: true
    },
    location: {
        address: String,
        city: String,
        state: String,
        country: {
            type: String,
            default: 'Nigeria'
        },
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    images: [{
        url: String,
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],
    amenities: [{
        type: String,
        enum: ['wifi', 'pool', 'gym', 'restaurant', 'parking', 'spa', 'conference', 'airport_shuttle', 'room_service', 'bar']
    }],
    contactInfo: {
        phone: String,
        email: String,
        website: String
    },
    commissionRate: {
        type: Number,
        default: 30,
        min: 0,
        max: 100
    },
    isActive: {
        type: Boolean,
        default: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    totalBookings: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create slug from name before saving
hotelSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Hotel', hotelSchema);