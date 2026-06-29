// controllers/architectController.js
const Architect = require('../models/Architect');
const StructuralAssessment = require('../models/StructuralAssessment');
const User = require('../models/User');

// Helper function to get base URL
function getBaseUrl(req) {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    return `${req.protocol}://${req.get('host')}`;
}

// ============= ARCHITECT REGISTRATION =============

// Get registration page
exports.getArchitectRegister = async (req, res) => {
    try {
        // Check if user is ALREADY an architect
        if (req.session.userType === 'architect') {
            req.flash('info', 'You are already registered as a REVAAMP Partner Architect');
            return res.redirect('/architect/dashboard');
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

        res.render('architect-register', {
            title: 'Become a REVAAMP Partner Architect - RevaampAP',
            currentPath: '/architect/register',
            user: req.session.userId ? { name: req.session.userName, type: req.session.userType } : null,
            userData: userData,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Get architect register error:', error);
        req.flash('error', 'Error loading registration page');
        res.redirect('/');
    }
};

// Post registration
exports.postArchitectRegister = async (req, res) => {
    try {
        const {
            name, email, phone, password, confirmPassword,
            arconNumber, countryOfPractice, territory, experience, firm, specialization
        } = req.body;

        console.log('Received architect files:', req.files);

        // Validation
        if (!name || !email || !phone || !arconNumber || !countryOfPractice || !firm) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('/architect/register');
        }

        // Check if architect already exists
        const existingArchitect = await Architect.findOne({ email: email.toLowerCase() });
        if (existingArchitect) {
            req.flash('error', 'Email already registered. Please login instead.');
            return res.redirect('/architect/register');
        }

        // Handle file uploads from req.files
        let arconCertificateUrl = '';
        let firmRegistrationUrl = '';
        let professionalProfileUrl = '';

        if (req.files) {
            if (req.files.arconCertificate && req.files.arconCertificate[0]) {
                arconCertificateUrl = '/uploads/documents/' + req.files.arconCertificate[0].filename;
            }
            if (req.files.firmRegistration && req.files.firmRegistration[0]) {
                firmRegistrationUrl = '/uploads/documents/' + req.files.firmRegistration[0].filename;
            }
            if (req.files.professionalProfile && req.files.professionalProfile[0]) {
                professionalProfileUrl = '/uploads/documents/' + req.files.professionalProfile[0].filename;
            }
        }

        // Check if password validation is needed (for new users)
        let finalPassword = password;

        if (req.session.userId) {
            const existingUser = await User.findById(req.session.userId);
            if (existingUser) {
                finalPassword = existingUser.password;
            }
        } else {
            if (!password || !confirmPassword) {
                req.flash('error', 'Password is required');
                return res.redirect('/architect/register');
            }
            if (password !== confirmPassword) {
                req.flash('error', 'Passwords do not match');
                return res.redirect('/architect/register');
            }
            if (password.length < 8) {
                req.flash('error', 'Password must be at least 8 characters long');
                return res.redirect('/architect/register');
            }
        }

        // Normalize specialization (comma-separated string -> array)
        let specializationArr = [];
        if (specialization) {
            specializationArr = Array.isArray(specialization)
                ? specialization
                : specialization.split(',').map(s => s.trim()).filter(Boolean);
        }

        // Create new architect
        const architect = new Architect({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: finalPassword,
            firm: firm.trim(),
            arconNumber: arconNumber.trim(),
            countryOfPractice: countryOfPractice.trim(),
            territory: territory ? territory.trim() : '',
            experience: experience || '',
            specialization: specializationArr,
            arconCertificate: {
                url: arconCertificateUrl,
                filename: req.files?.arconCertificate?.[0]?.filename,
                uploadedAt: new Date()
            },
            firmRegistration: {
                url: firmRegistrationUrl,
                filename: req.files?.firmRegistration?.[0]?.filename,
                uploadedAt: new Date()
            },
            professionalProfile: {
                url: professionalProfileUrl,
                filename: req.files?.professionalProfile?.[0]?.filename,
                uploadedAt: new Date()
            },
            architectProfile: {
                isActive: false,
                mandateAccepted: true,
                mandateAcceptedAt: new Date()
            }
        });

        await architect.save();

        console.log(`✅ REVAAMP Partner Architect registered: ${architect.email}`);

        req.flash('success', '✅ Registration successful! Your application has been submitted and is pending review by the admin. You will be notified once approved. Please login to continue.');
        return res.redirect('/login');

    } catch (error) {
        console.error('Architect registration error:', error);
        if (error.code === 11000) {
            req.flash('error', 'Email already registered. Please use a different email.');
        } else {
            req.flash('error', 'Registration failed. Please try again.');
        }
        res.redirect('/architect/register');
    }
};

// ============= ARCHITECT DASHBOARD =============

exports.getDashboard = async (req, res) => {
    try {
        const architect = await Architect.findById(req.session.userId);

        if (!architect) {
            req.flash('error', 'Architect not found');
            return res.redirect('/login');
        }

        // Get this architect's structural assessments
        const assessments = await StructuralAssessment.find({
            architect: architect._id
        }).sort('-createdAt').limit(20);

        res.render('architect/dashboard', {
            title: 'Architect Dashboard - RevaampAPA',
            user: architect,
            assessments: assessments,
            stats: {
                assessmentsSubmitted: architect.architectProfile?.kpiMetrics?.assessmentsSubmitted || assessments.length,
                projectsVerified: architect.architectProfile?.kpiMetrics?.projectsVerified || 0
            },
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Architect dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
};

// ============= STRUCTURAL ASSESSMENT REPORT =============

// Get the structural assessment report form
exports.getNewAssessment = async (req, res) => {
    try {
        const architect = await Architect.findById(req.session.userId);

        res.render('architect/assessment-form', {
            title: 'Structural Assessment Report - RevaampAP',
            user: architect,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Get new assessment error:', error);
        res.redirect('/architect/dashboard');
    }
};

// Submit the structural assessment report
exports.postNewAssessment = async (req, res) => {
    try {
        const architect = await Architect.findById(req.session.userId);
        const {
            projectId, projectTitle, projectLocation, promoterName, proposedUse,
            siteConditions, foundationAssessment, structuralDesignReview,
            materialsAssessment, loadBearingEvaluation, complianceWithCodes,
            identifiedRisks, recommendations, remarks,
            structuralIntegrityRating, recommendation, conditions
        } = req.body;

        if (!projectTitle) {
            req.flash('error', 'Project title is required');
            return res.redirect('/architect/assessment/new');
        }

        // Handle supporting document uploads
        const supportingDocuments = [];
        if (req.files && req.files.length) {
            req.files.forEach(file => {
                supportingDocuments.push({
                    name: file.originalname,
                    url: '/uploads/documents/' + file.filename,
                    uploadedAt: new Date()
                });
            });
        }

        const assessment = new StructuralAssessment({
            architect: architect._id,
            project: projectId || undefined,
            projectTitle: projectTitle.trim(),
            projectLocation,
            promoterName,
            proposedUse,
            siteConditions,
            foundationAssessment,
            structuralDesignReview,
            materialsAssessment,
            loadBearingEvaluation,
            complianceWithCodes,
            identifiedRisks,
            recommendations,
            remarks,
            structuralIntegrityRating: structuralIntegrityRating || 'good',
            recommendation: recommendation || 'approved',
            conditions,
            supportingDocuments,
            status: 'submitted',
            submittedAt: new Date()
        });

        await assessment.save();

        // Bump KPI counter
        architect.architectProfile.kpiMetrics.assessmentsSubmitted =
            (architect.architectProfile.kpiMetrics.assessmentsSubmitted || 0) + 1;
        await architect.save();

        console.log(`✅ Structural assessment submitted by ${architect.email} for "${assessment.projectTitle}"`);

        req.flash('success', 'Structural assessment report submitted successfully.');
        res.redirect(`/architect/assessment/${assessment._id}`);
    } catch (error) {
        console.error('Submit assessment error:', error);
        req.flash('error', 'Error submitting structural assessment report');
        res.redirect('/architect/assessment/new');
    }
};

// View a single submitted assessment (ownership-scoped)
exports.getAssessmentDetail = async (req, res) => {
    try {
        const architect = await Architect.findById(req.session.userId);
        const assessment = await StructuralAssessment.findOne({
            _id: req.params.id,
            architect: architect._id
        });

        if (!assessment) {
            req.flash('error', 'Assessment report not found');
            return res.redirect('/architect/dashboard');
        }

        res.render('architect/assessment-detail', {
            title: `${assessment.projectTitle} - Structural Assessment - RevaampAP`,
            user: architect,
            assessment: assessment
        });
    } catch (error) {
        console.error('Get assessment detail error:', error);
        req.flash('error', 'Error loading assessment report');
        res.redirect('/architect/dashboard');
    }
};
