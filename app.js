// app.js - RevaampAP Main Application File
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const fs = require('fs');

// Import models
const User = require('./models/User');
const Property = require('./models/Property');
const Transaction = require('./models/Transaction');
const Inquiry = require('./models/Inquiry');

// Initialize app
const app = express();

// ============= DATABASE CONNECTION =============
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/revaampap', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 60000,
            socketTimeoutMS: 60000,
            connectTimeoutMS: 60000
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        setTimeout(connectDB, 5000);
    }
};
connectDB();

// ============= MIDDLEWARE SETUP =============

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Method override for PUT/DELETE requests
app.use(methodOverride('_method'));

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'revaampap-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/revaampap',
        touchAfter: 24 * 3600
    })
};

// Trust proxy in production (for secure cookies behind reverse proxy)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use(session(sessionConfig));

// Flash messages
app.use(flash());

// Make flash messages and user data available to all views
app.use(async (req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.info = req.flash('info');
    res.locals.warning = req.flash('warning');
    res.locals.user = req.session.userId ? { 
        id: req.session.userId, 
        name: req.session.userName,
        email: req.session.userEmail,
        type: req.session.userType
    } : null;
    res.locals.currentPath = req.path;
    
    // Fetch full user data for logged-in users
    if (req.session.userId && !res.locals.currentUser) {
        try {
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                res.locals.currentUser = user;
                req.currentUser = user;
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    }
    next();
});

// ============= VIEW ENGINE SETUP =============
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============= STATIC FILES =============
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Create upload directories if they don't exist
const uploadDirs = [
    'public/uploads',
    'public/uploads/profiles',
    'public/uploads/qrcodes',
    'public/uploads/blogs',
    'public/uploads/properties',
    'public/uploads/documents',
    'public/uploads/hotels'
];

uploadDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
    }
});

// ============= ROUTES =============

// Auth routes (public)
app.use('/', require('./routes/authRoutes'));

// Property Owner routes
app.use('/property-owner', require('./routes/propertyOwnerRoutes'));

// Project routes
app.use('/projects', require('./routes/projectRoutes'));

// Promoter routes
app.use('/promoter', require('./routes/promoterRoutes'));

// Superadmin routes
app.use('/superadmin', require('./routes/superadminRoutes'));

// Public property routes
app.use('/properties', require('./routes/propertyRoutes'));

// Blog routes
app.use('/blog', require('./routes/blogRoutes'));

// Inquiry routes
app.use('/', require('./routes/inquiryRoutes'));

// Project Subscriber routes
app.use('/project-subscriber', require('./routes/projectSubscriberRoutes'));

// Solicitor routes
app.use('/solicitor', require('./routes/solicitorRoutes'));

// Hotel routes
app.use('/hotels', require('./routes/hotelRoutes'));

// ============= REFERRAL TRACKING ROUTES =============
// Referral tracking route for promoter referral links
app.get('/referral/track/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const ReferralClick = require('./models/ReferralClick');
        const User = require('./models/User');
        
        console.log(`🔗 Referral link clicked with code: ${code}`);
        
        // Extract user ID from the code (format: PROMO-{userId})
        let promoterId = null;
        
        if (code.startsWith('PROMO-')) {
            // Extract the ID part after PROMO-
            const extractedId = code.replace('PROMO-', '');
            console.log(`Extracted ID from code: ${extractedId}`);
            
            // Try to find user by this ID
            const user = await User.findById(extractedId);
            if (user) {
                promoterId = user._id;
                console.log(`✅ Found promoter by ID: ${user.email}`);
            } else {
                console.log(`⚠️ No user found with ID: ${extractedId}`);
            }
        } else {
            // Try to find by the code directly in the database
            const user = await User.findOne({ 'promoterProfile.referralCode': code });
            if (user) {
                promoterId = user._id;
                console.log(`✅ Found promoter by referral code: ${user.email}`);
            }
        }
        
        if (promoterId) {
            // Track the click
            const click = new ReferralClick({
                referrer: promoterId,
                referralCode: code,
                referralType: 'promoter',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                referrerUrl: req.headers.referer || 'direct',
                clickedAt: new Date()
            });
            
            await click.save();
            console.log(`✅ Referral click saved to database, ID: ${click._id}`);
            
            // Update promoter's click count
            await User.findByIdAndUpdate(promoterId, {
                $inc: { 
                    'referralStats.totalClicks': 1,
                    'referralStats.referralClicks': 1 
                }
            });
            
            console.log(`✅ Promoter stats updated for ${promoterId}`);
        } else {
            console.log(`⚠️ No promoter found for code: ${code}`);
        }
        
        // Redirect to promoter registration page with referral code
        res.redirect(`/promoter/register?ref=${code}`);
        
    } catch (error) {
        console.error('Referral tracking error:', error);
        res.redirect('/promoter/register');
    }
});

// Legacy referral tracking route (for backward compatibility)
app.get('/r/:code', require('./controllers/referralController').handleReferral);

// ============= PUBLIC PAGES =============

// Home page
app.get('/', async (req, res) => {
    try {
        const featuredProperties = await Property.find({ 
            verificationStatus: 'verified',
            status: 'available',
            featured: true
        })
        .select('title slug price location images propertyType transactionType')
        .limit(6)
        .sort('-createdAt');
        
        const recentProperties = await Property.find({ 
            verificationStatus: 'verified',
            status: 'available'
        })
        .select('title slug price location images propertyType transactionType')
        .limit(9)
        .sort('-createdAt');
        
        const totalProperties = await Property.countDocuments({ verificationStatus: 'verified', status: 'available' });
        const totalPromoters = await User.countDocuments({ userType: 'promoter', 'promoterProfile.isApproved': true });
        const totalTransactions = await Transaction.countDocuments({ paymentStatus: 'completed' });
        
        res.render('index', {
            title: 'RevaampAP - Property Promotion Platform',
            metaDescription: 'Find verified properties and earn 70% commission as a promoter.',
            currentPath: '/',
            featuredProperties,
            recentProperties,
            stats: {
                totalProperties: totalProperties || 0,
                totalPromoters: totalPromoters || 0,
                totalTransactions: totalTransactions || 0
            }
        });
    } catch (error) {
        console.error('Home page error:', error);
        res.render('index', {
            title: 'RevaampAP - Property Promotion Platform',
            currentPath: '/',
            featuredProperties: [],
            recentProperties: [],
            stats: { totalProperties: 0, totalPromoters: 0, totalTransactions: 0 }
        });
    }
});

// About page
app.get('/about', (req, res) => {
    res.render('about', {
        title: 'About Us - RevaampAP',
        currentPath: '/about',
        user: req.session.userId ? { name: req.session.userName } : null
    });
});

// Contact page
app.get('/contact', (req, res) => {
    res.render('contact', {
        title: 'Contact Us - RevaampAP',
        currentPath: '/contact',
        user: req.session.userId ? { name: req.session.userName } : null
    });
});

// How It Works page
app.get('/how-it-works', (req, res) => {
    res.render('how-it-works', {
        title: 'How It Works - RevaampAP',
        currentPath: '/how-it-works'
    });
});

// Terms page
app.get('/terms', (req, res) => {
    res.render('terms', {
        title: 'Terms of Service - RevaampAP',
        currentPath: '/terms'
    });
});

// Privacy page
app.get('/privacy', (req, res) => {
    res.render('privacy', {
        title: 'Privacy Policy - RevaampAP',
        currentPath: '/privacy'
    });
});

// Cookies page
app.get('/cookies', (req, res) => {
    res.render('cookies', {
        title: 'Cookie Policy - RevaampAP',
        currentPath: '/cookies'
    });
});

// ============= DASHBOARD REDIRECT =============
app.get('/dashboard', async (req, res) => {
    try {
        if (!req.session.userId) {
            req.flash('error', 'Please login to access your dashboard');
            return res.redirect('/login');
        }
        
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.session.destroy();
            req.flash('error', 'User not found. Please login again.');
            return res.redirect('/login');
        }
        
        if (user.userType === 'property_owner') {
            return res.redirect('/property-owner/dashboard');
        } else if (user.userType === 'promoter') {
            return res.redirect('/promoter/dashboard');
        } else if (user.userType === 'superadmin' || user.userType === 'admin') {
            return res.redirect('/superadmin/dashboard');
        } else {
            return res.redirect('/');
        }
    } catch (error) {
        console.error('Dashboard redirect error:', error);
        req.flash('error', 'Error loading dashboard');
        return res.redirect('/');
    }
});

// ============= API ROUTES =============

// Get featured properties
app.get('/api/properties/featured', async (req, res) => {
    try {
        const properties = await Property.find({ 
            verificationStatus: 'verified',
            status: 'available',
            featured: true
        })
        .select('title slug price location images propertyType transactionType featured')
        .limit(6)
        .sort('-createdAt');
        
        res.json({ success: true, properties });
    } catch (error) {
        console.error('API error:', error);
        res.json({ success: false, properties: [] });
    }
});

// Get recent properties
app.get('/api/properties/recent', async (req, res) => {
    try {
        const properties = await Property.find({ 
            verificationStatus: 'verified',
            status: 'available'
        })
        .select('title slug price location images propertyType transactionType')
        .limit(12)
        .sort('-createdAt');
        
        res.json({ success: true, properties });
    } catch (error) {
        console.error('API error:', error);
        res.json({ success: false, properties: [] });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const propertyCount = await Property.countDocuments({ verificationStatus: 'verified', status: 'available' });
        const promoterCount = await User.countDocuments({ userType: 'promoter', 'promoterProfile.isApproved': true });
        const transactionCount = await Transaction.countDocuments({ paymentStatus: 'completed' });
        
        res.json({
            success: true,
            propertyCount: propertyCount || 0,
            promoterCount: promoterCount || 0,
            transactionCount: transactionCount || 0
        });
    } catch (error) {
        console.error('Stats API error:', error);
        res.json({ success: false, propertyCount: 0, promoterCount: 0, transactionCount: 0 });
    }
});

// Newsletter subscription
app.post('/api/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email || !email.includes('@')) {
            return res.json({ success: false, message: 'Invalid email address' });
        }
        
        console.log(`📧 Newsletter subscription: ${email}`);
        
        res.json({ success: true, message: 'Successfully subscribed!' });
    } catch (error) {
        console.error('Newsletter error:', error);
        res.json({ success: false, message: 'Error subscribing' });
    }
});

// Contact form submission
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        
        if (!name || !email || !subject || !message) {
            return res.json({ success: false, message: 'Please fill in all required fields' });
        }
        
        console.log('Contact form submission:', { name, email, phone, subject, message });
        
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.json({ success: false, message: 'Error sending message' });
    }
});

// ============= ERROR HANDLING =============

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', {
        title: 'Page Not Found - RevaampAP',
        message: 'The page you are looking for does not exist.',
        currentPath: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    
    if (err.name === 'ValidationError') {
        req.flash('error', 'Validation error: ' + err.message);
        return res.redirect('back');
    }
    
    if (err.name === 'CastError') {
        req.flash('error', 'Invalid ID format');
        return res.redirect('back');
    }
    
    if (err.code === 11000) {
        req.flash('error', 'Duplicate entry error');
        return res.redirect('back');
    }
    
    res.status(500).render('500', {
        title: 'Server Error - RevaampAP',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong on our end. Please try again later.',
        currentPath: req.path
    });
});

// ============= SERVER START =============
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n=================================`);
    console.log(`🚀 RevaampAP Server Running!`);
    console.log(`=================================`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Not Connected ❌'}`);
    console.log(`=================================\n`);
});

module.exports = app;