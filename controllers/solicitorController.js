// controllers/solicitorController.js
const Solicitor = require('../models/Solicitor');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Helper function to get base URL
function getBaseUrl(req) {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    return `${req.protocol}://${req.get('host')}`;
}

// ============= REVAAMP PARTNER SOLICITOR REGISTRATION =============

// Get registration page - FIXED: Allow logged-in users to register as solicitor
exports.getSolicitorRegister = async (req, res) => {
    try {
        // Check if user is ALREADY a solicitor (different from being logged in)
        if (req.session.userType === 'solicitor') {
            req.flash('info', 'You are already registered as a REVAAMP Partner Solicitor');
            return res.redirect('/solicitor/dashboard');
        }
        
        // Pre-fill form with existing user data if logged in
        let userData = null;
        if (req.session.userId) {
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                userData = {
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                };
            }
        }
        
        res.render('solicitor-register', {
            title: 'Become a REVAAMP Partner Solicitor',
            currentPath: '/solicitor/register',
            user: req.session.userId ? { name: req.session.userName, type: req.session.userType } : null,
            userData: userData
        });
    } catch (error) {
        console.error('Get solicitor register error:', error);
        req.flash('error', 'Error loading registration page');
        res.redirect('/');
    }
};

// Post registration - FIXED: Handle existing user session
exports.postSolicitorRegister = async (req, res) => {
    try {
        const {
            name, email, phone, password, confirmPassword,
            lawFirm, barNumber, countryOfPractice, territory, experience
        } = req.body;

        // Validation
        if (!name || !email || !phone || !lawFirm || !barNumber || !countryOfPractice || !territory) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('/solicitor/register');
        }

        // Check if solicitor already exists
        const existingSolicitor = await Solicitor.findOne({ email: email.toLowerCase() });
        if (existingSolicitor) {
            req.flash('error', 'Email already registered. Please login instead.');
            return res.redirect('/solicitor/register');
        }

        // Handle file uploads
        let barCertificateUrl = '';
        let firmRegistrationUrl = '';

        if (req.files) {
            if (req.files.barCertificate) {
                barCertificateUrl = '/uploads/documents/' + req.files.barCertificate[0].filename;
            }
            if (req.files.firmRegistration) {
                firmRegistrationUrl = '/uploads/documents/' + req.files.firmRegistration[0].filename;
            }
        }

        // Check if password validation is needed (for new users)
        let finalPassword = password;
        
        if (req.session.userId) {
            // User is already logged in from another role - no password needed
            const existingUser = await User.findById(req.session.userId);
            if (existingUser) {
                finalPassword = existingUser.password; // Use existing password
            }
        } else {
            // New user - require password validation
            if (!password || !confirmPassword) {
                req.flash('error', 'Password is required');
                return res.redirect('/solicitor/register');
            }
            if (password !== confirmPassword) {
                req.flash('error', 'Passwords do not match');
                return res.redirect('/solicitor/register');
            }
            if (password.length < 8) {
                req.flash('error', 'Password must be at least 8 characters long');
                return res.redirect('/solicitor/register');
            }
        }

        // Create new solicitor
        const solicitor = new Solicitor({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: finalPassword,
            lawFirm: lawFirm.trim(),
            barNumber: barNumber.trim(),
            countryOfPractice: countryOfPractice.trim(),
            territory: territory.trim(),
            experience: experience || '',
            barCertificate: {
                url: barCertificateUrl,
                filename: req.files?.barCertificate?.[0]?.filename,
                uploadedAt: new Date()
            },
            firmRegistration: {
                url: firmRegistrationUrl,
                filename: req.files?.firmRegistration?.[0]?.filename,
                uploadedAt: new Date()
            },
            partnerProfile: {
                isActive: false,
                mandateAccepted: true,
                mandateAcceptedAt: new Date()
            }
        });

        await solicitor.save();

        console.log(`✅ REVAAMP Partner Solicitor registered: ${solicitor.email}`);

        req.flash('success', 'Registration successful! Your application is pending review. You will be notified once approved.');
        
        // If user was already logged in, redirect to dashboard
        if (req.session.userId) {
            res.redirect('/solicitor/dashboard');
        } else {
            res.redirect('/login');
        }

    } catch (error) {
        console.error('Solicitor registration error:', error);
        if (error.code === 11000) {
            req.flash('error', 'Email already registered. Please use a different email.');
        } else {
            req.flash('error', 'Registration failed. Please try again.');
        }
        res.redirect('/solicitor/register');
    }
};

// ============= HECTARE BY HECTARE SOLICITOR REGISTRATION =============

// Get registration page - FIXED: Allow logged-in users to register as hectare solicitor
exports.getHectareSolicitorRegister = async (req, res) => {
    try {
        // Check if user is ALREADY a hectare solicitor (different from being logged in)
        if (req.session.userType === 'hectare_solicitor') {
            req.flash('info', 'You are already registered as a Hectare by Hectare Solicitor');
            return res.redirect('/hectare-solicitor/dashboard');
        }
        
        // Pre-fill form with existing user data if logged in
        let userData = null;
        if (req.session.userId) {
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                userData = {
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                };
            }
        }
        
        res.render('hectare-solicitor-register', {
            title: 'Become a Hectare by Hectare Solicitor',
            currentPath: '/hectare-solicitor/register',
            user: req.session.userId ? { name: req.session.userName, type: req.session.userType } : null,
            userData: userData
        });
    } catch (error) {
        console.error('Get hectare solicitor register error:', error);
        req.flash('error', 'Error loading registration page');
        res.redirect('/');
    }
};

// Post registration - FIXED: Handle existing user session
exports.postHectareSolicitorRegister = async (req, res) => {
    try {
        const {
            name, email, phone, password, confirmPassword,
            lawFirm, barNumber, countryOfPractice, experience
        } = req.body;

        // Validation
        if (!name || !email || !phone || !lawFirm || !barNumber || !countryOfPractice) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('/hectare-solicitor/register');
        }

        // Check if solicitor already exists
        const HectareSolicitor = require('../models/HectareSolicitor');
        const existingSolicitor = await HectareSolicitor.findOne({ email: email.toLowerCase() });
        if (existingSolicitor) {
            req.flash('error', 'Email already registered. Please login instead.');
            return res.redirect('/hectare-solicitor/register');
        }

        // Handle file upload
        let barCertificateUrl = '';
        if (req.file) {
            barCertificateUrl = '/uploads/documents/' + req.file.filename;
        }

        // Check if password validation is needed (for new users)
        let finalPassword = password;
        
        if (req.session.userId) {
            // User is already logged in from another role - no password needed
            const existingUser = await User.findById(req.session.userId);
            if (existingUser) {
                finalPassword = existingUser.password; // Use existing password
            }
        } else {
            // New user - require password validation
            if (!password || !confirmPassword) {
                req.flash('error', 'Password is required');
                return res.redirect('/hectare-solicitor/register');
            }
            if (password !== confirmPassword) {
                req.flash('error', 'Passwords do not match');
                return res.redirect('/hectare-solicitor/register');
            }
            if (password.length < 8) {
                req.flash('error', 'Password must be at least 8 characters long');
                return res.redirect('/hectare-solicitor/register');
            }
        }

        // Create new hectare solicitor
        const hectareSolicitor = new HectareSolicitor({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: finalPassword,
            lawFirm: lawFirm.trim(),
            barNumber: barNumber.trim(),
            countryOfPractice: countryOfPractice.trim(),
            experience: experience || '',
            barCertificate: {
                url: barCertificateUrl,
                filename: req.file?.filename,
                uploadedAt: new Date()
            },
            hectareProfile: {
                isActive: false
            }
        });

        await hectareSolicitor.save();

        console.log(`✅ Hectare by Hectare Solicitor registered: ${hectareSolicitor.email}`);

        req.flash('success', 'Registration successful! Your application is pending review. You will be notified once approved.');
        
        // If user was already logged in, redirect to dashboard
        if (req.session.userId) {
            res.redirect('/hectare-solicitor/dashboard');
        } else {
            res.redirect('/login');
        }

    } catch (error) {
        console.error('Hectare Solicitor registration error:', error);
        if (error.code === 11000) {
            req.flash('error', 'Email already registered. Please use a different email.');
        } else {
            req.flash('error', 'Registration failed. Please try again.');
        }
        res.redirect('/hectare-solicitor/register');
    }
};

// ============= SOLICITOR DASHBOARD =============

// Get solicitor dashboard
exports.getDashboard = async (req, res) => {
    try {
        const SolicitorModel = require('../models/Solicitor');
        const solicitor = await SolicitorModel.findById(req.session.userId);

        if (!solicitor) {
            req.flash('error', 'Solicitor not found');
            return res.redirect('/login');
        }

        // Get recent transactions
        const transactions = await Transaction.find({ 
            solicitor: solicitor._id 
        }).populate('property', 'title').sort('-createdAt').limit(10);

        res.render('solicitor/dashboard', {
            title: 'Partner Solicitor Dashboard - RevaampAPA',
            user: solicitor,
            transactions: transactions,
            stats: {
                transactionsInitiated: solicitor.partnerProfile?.kpiMetrics?.transactionsInitiated || 0,
                promotersOnboarded: solicitor.partnerProfile?.kpiMetrics?.promotersOnboarded || 0,
                totalEarnings: solicitor.partnerProfile?.earnings?.totalLegalFees || 0,
                pendingPayments: solicitor.partnerProfile?.earnings?.pendingPayments || 0
            },
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Solicitor dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
};

// Get hectare solicitor dashboard
exports.getHectareDashboard = async (req, res) => {
    try {
        const HectareSolicitor = require('../models/HectareSolicitor');
        const Cooperative = require('../models/Cooperative');
        const solicitor = await HectareSolicitor.findById(req.session.userId);

        if (!solicitor) {
            req.flash('error', 'Solicitor not found');
            return res.redirect('/login');
        }

        // Get assigned cooperatives
        const cooperatives = await Cooperative.find({ 
            solicitor: solicitor._id 
        }).sort('-createdAt');

        res.render('hectare-solicitor/dashboard', {
            title: 'Hectare by Hectare Solicitor Dashboard - RevaampAPA',
            user: solicitor,
            cooperatives: cooperatives,
            stats: {
                cooperativesManaged: cooperatives.length,
                totalEarnings: solicitor.hectareProfile?.earnings?.totalFees || 0,
                pendingPayments: solicitor.hectareProfile?.earnings?.pendingPayments || 0,
                skillsAcquired: solicitor.hectareProfile?.skillsAcquired?.length || 0
            },
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Hectare solicitor dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
};

// ============= API ROUTES =============

// Get solicitor stats
exports.getSolicitorStats = async (req, res) => {
    try {
        const SolicitorModel = require('../models/Solicitor');
        const solicitor = await SolicitorModel.findById(req.session.userId);

        res.json({
            success: true,
            stats: {
                transactionsInitiated: solicitor.partnerProfile?.kpiMetrics?.transactionsInitiated || 0,
                promotersOnboarded: solicitor.partnerProfile?.kpiMetrics?.promotersOnboarded || 0,
                totalEarnings: solicitor.partnerProfile?.earnings?.totalLegalFees || 0,
                pendingPayments: solicitor.partnerProfile?.earnings?.pendingPayments || 0
            }
        });
    } catch (error) {
        console.error('Get solicitor stats error:', error);
        res.status(500).json({ error: 'Error loading stats' });
    }
};

// Update KPI metrics
exports.updateKPIs = async (req, res) => {
    try {
        const { transactionsInitiated, promotersOnboarded, cooperativeSocieties } = req.body;
        const SolicitorModel = require('../models/Solicitor');

        await SolicitorModel.findByIdAndUpdate(req.session.userId, {
            'partnerProfile.kpiMetrics.transactionsInitiated': transactionsInitiated,
            'partnerProfile.kpiMetrics.promotersOnboarded': promotersOnboarded,
            'partnerProfile.kpiMetrics.cooperativeSocietiesEstablished': cooperativeSocieties
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Update KPIs error:', error);
        res.status(500).json({ error: 'Error updating KPIs' });
    }
};