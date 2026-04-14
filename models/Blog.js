// models/Blog.js
const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
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
    excerpt: {
        type: String,
        required: true,
        maxlength: 300
    },
    content: {
        type: String,
        required: true
    },
    featuredImage: {
        type: String,
        required: true
    },
    ogImage: {
        type: String,
        default: function() {
            return this.featuredImage; // Default to featured image for social sharing
        }
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    authorName: {
        type: String,
        required: true
    },
    categories: [{
        type: String,
        enum: [
            'Market News', 
            'Buying Guide', 
            'Selling Tips', 
            'Renting Advice', 
            'Investment',
            'Legal Guide',
            'Agent Tips',
            'Property Spotlight',
            'Industry Insights'
        ]
    }],
    tags: [String],
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    publishedAt: {
        type: Date
    },
    featured: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    readingTime: {
        type: Number, // in minutes
        default: 0
    },
    metaTitle: String,
    metaDescription: String,
    metaKeywords: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Generate slug from title
blogSchema.pre('save', function(next) {
    if (this.isModified('title')) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);
    }
    
    // Calculate reading time (average reading speed: 200 words per minute)
    if (this.isModified('content')) {
        const wordCount = this.content.split(/\s+/).length;
        this.readingTime = Math.ceil(wordCount / 200);
    }
    
    // Set OG image to featured image if not set
    if (!this.ogImage && this.featuredImage) {
        this.ogImage = this.featuredImage;
    }
    
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Blog', blogSchema);