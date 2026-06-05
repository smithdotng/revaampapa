// controllers/projectSubscriberController.js
const User = require('../models/User');
const Project = require('../models/Project');
const slugify = require('slugify');

// Helper function to get base URL
function getBaseUrl(req) {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    return `${req.protocol}://${req.get('host')}`;
}

// ============= DASHBOARD =============

// Project Subscriber Dashboard
exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        // Get subscriber's projects
        const projects = await Project.find({ subscriber: user._id })
            .sort('-createdAt')
            .limit(5);
        
        const totalProjects = await Project.countDocuments({ subscriber: user._id });
        const completedProjects = await Project.countDocuments({ 
            subscriber: user._id, 
            status: 'completed' 
        });
        const inProgressProjects = await Project.countDocuments({ 
            subscriber: user._id, 
            status: 'in_progress' 
        });
        
        const totalProjectValue = await Project.aggregate([
            { $match: { subscriber: user._id } },
            { $group: { _id: null, total: { $sum: '$projectValue' } } }
        ]);
        
        const stats = {
            totalProjects,
            completedProjects,
            inProgressProjects,
            totalProjectValue: totalProjectValue[0]?.total || 0,
            bankGuaranteeStatus: user.projectSubscriberProfile?.bankGuarantee?.status || 'pending',
            subscriptionStatus: user.projectSubscriberProfile?.subscriptionStatus || 'inactive'
        };
        
        res.render('project-subscriber/dashboard', {
            title: 'Project Management Dashboard - RevaampAP',
            user: user,
            projects: projects,
            stats: stats,
            baseUrl: getBaseUrl(req)
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
};

// ============= PROJECT MANAGEMENT =============

// Get all projects
exports.getProjects = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { status, page = 1 } = req.query;
        const limit = 10;
        const skip = (page - 1) * limit;
        
        let query = { subscriber: user._id };
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const projects = await Project.find(query)
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await Project.countDocuments(query);
        
        res.render('project-subscriber/projects', {
            title: 'My Projects - RevaampAP',
            user: user,
            projects: projects,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total: total,
            filters: req.query
        });
    } catch (error) {
        console.error('Get projects error:', error);
        req.flash('error', 'Error loading projects');
        res.redirect('/project-subscriber/dashboard');
    }
};

// Get single project details
exports.getProjectDetails = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const project = await Project.findOne({ 
            slug: req.params.slug,
            subscriber: user._id 
        }).populate('projectManager', 'name email phone');
        
        if (!project) {
            req.flash('error', 'Project not found');
            return res.redirect('/project-subscriber/projects');
        }
        
        res.render('project-subscriber/project-detail', {
            title: `${project.title} - RevaampAP`,
            user: user,
            project: project
        });
    } catch (error) {
        console.error('Get project details error:', error);
        req.flash('error', 'Error loading project');
        res.redirect('/project-subscriber/projects');
    }
};

// Create new project request
exports.getCreateProject = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        // Check if bank guarantee is approved
        const bankGuaranteeStatus = user.projectSubscriberProfile?.bankGuarantee?.status;
        
        res.render('project-subscriber/create-project', {
            title: 'Create New Project - RevaampAP',
            user: user,
            bankGuaranteeStatus: bankGuaranteeStatus
        });
    } catch (error) {
        console.error('Get create project error:', error);
        res.redirect('/project-subscriber/dashboard');
    }
};

// Submit new project request
exports.postCreateProject = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const {
            title, description, projectType,
            address, city, state,
            projectValue, projectDuration,
            bankName, bankGuaranteeRef
        } = req.body;
        
        // Check if bank guarantee is approved
        if (user.projectSubscriberProfile?.bankGuarantee?.status !== 'approved') {
            req.flash('error', 'Bank guarantee must be approved before creating a project');
            return res.redirect('/project-subscriber/bank-guarantee');
        }
        
        // Generate slug
        const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();
        
        // Calculate service fee (10% of project value)
        const serviceFeeAmount = parseFloat(projectValue) * 0.1;
        
        const project = new Project({
            title,
            slug,
            description,
            projectType,
            location: { address, city, state },
            projectValue: parseFloat(projectValue),
            projectDuration: parseInt(projectDuration),
            bankGuarantee: {
                amount: user.projectSubscriberProfile.bankGuarantee.amount,
                bankName: bankName,
                referenceNumber: bankGuaranteeRef,
                status: 'approved'
            },
            subscriber: user._id,
            serviceFee: {
                percentage: 10,
                amount: serviceFeeAmount,
                paid: false
            },
            status: 'pending_approval'
        });
        
        await project.save();
        
        // Update user's project count
        user.projectSubscriberProfile.totalProjects += 1;
        user.projectSubscriberProfile.totalProjectValue += parseFloat(projectValue);
        await user.save();
        
        req.flash('success', 'Project submitted successfully! Our team will review and approve it shortly.');
        res.redirect(`/project-subscriber/projects/${project.slug}`);
    } catch (error) {
        console.error('Create project error:', error);
        req.flash('error', 'Error creating project');
        res.redirect('/project-subscriber/projects/create');
    }
};

// ============= BANK GUARANTEE MANAGEMENT =============

// Bank guarantee page
exports.getBankGuarantee = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('project-subscriber/bank-guarantee', {
            title: 'Bank Guarantee - RevaampAP',
            user: user,
            bankGuarantee: user.projectSubscriberProfile?.bankGuarantee || null
        });
    } catch (error) {
        console.error('Get bank guarantee error:', error);
        res.redirect('/project-subscriber/dashboard');
    }
};

// Submit bank guarantee
exports.postBankGuarantee = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { bankName, guaranteeAmount, referenceNumber, issueDate, expiryDate } = req.body;
        
        // Handle file upload for bank guarantee document
        let documentUrl = '';
        if (req.file) {
            documentUrl = '/uploads/bank-guarantees/' + req.file.filename;
        }
        
        user.projectSubscriberProfile.bankGuarantee = {
            amount: parseFloat(guaranteeAmount),
            bankName: bankName,
            referenceNumber: referenceNumber,
            documentUrl: documentUrl,
            issueDate: new Date(issueDate),
            expiryDate: new Date(expiryDate),
            status: 'pending'
        };
        
        await user.save();
        
        req.flash('success', 'Bank guarantee submitted for verification. Our team will review it within 2-3 business days.');
        res.redirect('/project-subscriber/bank-guarantee');
    } catch (error) {
        console.error('Submit bank guarantee error:', error);
        req.flash('error', 'Error submitting bank guarantee');
        res.redirect('/project-subscriber/bank-guarantee');
    }
};

// ============= SUBSCRIPTION MANAGEMENT =============

// Subscription plans page
exports.getSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const plans = [
            {
                name: 'Basic',
                price: 50000,
                features: ['Up to 2 active projects', 'Basic reporting', 'Email support', 'Project tracking'],
                recommended: false
            },
            {
                name: 'Premium',
                price: 150000,
                features: ['Up to 5 active projects', 'Advanced reporting', 'Priority support', 'Dedicated project manager', 'Weekly updates'],
                recommended: true
            },
            {
                name: 'Enterprise',
                price: 500000,
                features: ['Unlimited projects', 'Custom reporting', '24/7 dedicated support', 'Multiple project managers', 'Daily updates', 'On-site visits'],
                recommended: false
            }
        ];
        
        res.render('project-subscriber/subscription', {
            title: 'Subscription Plans - RevaampAP',
            user: user,
            plans: plans,
            currentPlan: user.projectSubscriberProfile?.subscriptionPlan || 'basic',
            subscriptionStatus: user.projectSubscriberProfile?.subscriptionStatus || 'inactive'
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        res.redirect('/project-subscriber/dashboard');
    }
};

// Process subscription payment
exports.postSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { plan } = req.body;
        
        const planPrices = {
            basic: 50000,
            premium: 150000,
            enterprise: 500000
        };
        
        const amount = planPrices[plan];
        
        // Initialize Paystack payment
        const axios = require('axios');
        const response = await axios.post('https://api.paystack.co/transaction/initialize', {
            email: user.email,
            amount: amount * 100,
            callback_url: `${getBaseUrl(req)}/project-subscriber/subscription-callback`,
            metadata: {
                userId: user._id,
                plan: plan,
                purpose: 'subscription_fee'
            }
        }, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.status) {
            res.redirect(response.data.data.authorization_url);
        } else {
            throw new Error('Payment initialization failed');
        }
    } catch (error) {
        console.error('Subscription payment error:', error);
        req.flash('error', 'Error processing payment');
        res.redirect('/project-subscriber/subscription');
    }
};

// Subscription callback
exports.subscriptionCallback = async (req, res) => {
    try {
        const { reference } = req.query;
        const axios = require('axios');
        
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        });
        
        if (response.data.data.status === 'success') {
            const { userId, plan } = response.data.data.metadata;
            
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            
            await User.findByIdAndUpdate(userId, {
                'projectSubscriberProfile.subscriptionPlan': plan,
                'projectSubscriberProfile.subscriptionStatus': 'active',
                'projectSubscriberProfile.subscriptionDate': new Date(),
                'projectSubscriberProfile.subscriptionExpiry': expiryDate,
                'projectSubscriberProfile.isApproved': true,
                'projectSubscriberProfile.approvalDate': new Date()
            });
            
            req.flash('success', 'Subscription activated successfully! You can now create projects.');
            res.redirect('/project-subscriber/dashboard');
        } else {
            req.flash('error', 'Payment verification failed');
            res.redirect('/project-subscriber/subscription');
        }
    } catch (error) {
        console.error('Subscription callback error:', error);
        req.flash('error', 'Payment verification failed');
        res.redirect('/project-subscriber/subscription');
    }
};

// ============= PROJECT UPDATES =============

// Get project updates
exports.getProjectUpdates = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const project = await Project.findOne({ 
            slug: req.params.slug,
            subscriber: user._id 
        });
        
        if (!project) {
            req.flash('error', 'Project not found');
            return res.redirect('/project-subscriber/projects');
        }
        
        res.render('project-subscriber/project-updates', {
            title: `${project.title} - Updates - RevaampAP`,
            user: user,
            project: project,
            updates: project.updates.sort((a, b) => b.postedAt - a.postedAt)
        });
    } catch (error) {
        console.error('Get project updates error:', error);
        res.redirect('/project-subscriber/projects');
    }
};

// ============= FINANCIALS =============

// Get project financials
exports.getProjectFinancials = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const project = await Project.findOne({ 
            slug: req.params.slug,
            subscriber: user._id 
        });
        
        if (!project) {
            req.flash('error', 'Project not found');
            return res.redirect('/project-subscriber/projects');
        }
        
        res.render('project-subscriber/project-financials', {
            title: `${project.title} - Financials - RevaampAP`,
            user: user,
            project: project
        });
    } catch (error) {
        console.error('Get project financials error:', error);
        res.redirect('/project-subscriber/projects');
    }
};

// ============= SETTINGS =============

// Settings page
exports.getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('project-subscriber/settings', {
            title: 'Settings - RevaampAP',
            user: user
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.redirect('/project-subscriber/dashboard');
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, countryOfResidence, passportNumber } = req.body;
        const user = await User.findById(req.session.userId);
        
        user.name = name;
        user.phone = phone;
        user.projectSubscriberProfile.countryOfResidence = countryOfResidence;
        user.projectSubscriberProfile.passportNumber = passportNumber;
        
        await user.save();
        
        req.flash('success', 'Profile updated successfully');
        res.redirect('/project-subscriber/settings');
    } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/project-subscriber/settings');
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.session.userId);
        
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/project-subscriber/settings');
        }
        
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/project-subscriber/settings');
        }
        
        if (newPassword.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/project-subscriber/settings');
        }
        
        user.password = newPassword;
        await user.save();
        
        req.flash('success', 'Password changed successfully');
        res.redirect('/project-subscriber/settings');
    } catch (error) {
        console.error('Change password error:', error);
        req.flash('error', 'Error changing password');
        res.redirect('/project-subscriber/settings');
    }
};