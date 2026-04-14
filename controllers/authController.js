// controllers/authController.js
const User = require('../models/User');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const emailService = require('../utils/email');

// Helper function to get base URL
function getBaseUrl(req) {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    return `${req.protocol}://${req.get('host')}`;
}

// ============= LOGIN HANDLERS =============

// Login page
exports.getLogin = (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('login', { 
        title: 'Login - RevaampAP',
        currentPath: '/login'
    });
};

// Login handler
exports.postLogin = async (req, res) => {
    try {
        const { email, password, remember } = req.body;
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }
        
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }
        
        // Check if user is suspended
        if (user.isSuspended) {
            req.flash('error', 'Your account has been suspended. Please contact support.');
            return res.redirect('/login');
        }
        
        req.session.userId = user._id;
        req.session.userType = user.userType;
        req.session.userName = user.name;
        req.session.userEmail = user.email;
        
        if (remember) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        } else {
            req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
        }
        
        // Redirect based on user type
        if (user.userType === 'superadmin') {
            res.redirect('/superadmin/dashboard');
        } else if (user.userType === 'property_owner') {
            res.redirect('/property-owner/dashboard');
        } else if (user.userType === 'project_subscriber') {
           if (!user.projectSubscriberProfile.isApproved || user.projectSubscriberProfile.subscriptionStatus !== 'active') {
               res.redirect('/project-subscriber/subscription');
            } else {
               res.redirect('/project-subscriber/dashboard');
            }
        } else if (user.userType === 'promoter') {
            if (!user.promoterProfile.isApproved) {
                res.redirect('/promoter/pending');
            } else {
                res.redirect('/promoter/dashboard');
            }
        } else if (user.userType === 'business_partner') {
            if (user.businessPartnerProfile.paymentStatus !== 'confirmed') {
                req.flash('error', 'Your payment is pending verification. Please wait for admin confirmation.');
                return res.redirect('/login');
           }
              res.redirect('/business-partner/dashboard');
        } else {
            res.redirect('/dashboard');
        }
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/login');
    }
};

// ============= PROPERTY OWNER REGISTRATION HANDLERS =============

// Property Owner registration page
exports.getRegister = (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('register', { 
        title: 'Register as Property Owner - RevaampAP',
        currentPath: '/register'
    });
};

// Property Owner registration handler
exports.postRegister = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword, company, rcNumber, newsletter } = req.body;
        
        console.log('Registration attempt:', { name, email, phone });
        
        // Validation
        if (!name || !email || !phone || !password) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('/register');
        }
        
        // Check if passwords match
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/register');
        }
        
        // Check password length
        if (password.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/register');
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            req.flash('error', 'Email already registered. Please login instead.');
            return res.redirect('/register');
        }
        
        // Validate Nigerian phone number
        const phoneRegex = /^(0|\+234)[7-9][0-1]\d{8}$/;
        if (!phoneRegex.test(phone)) {
            req.flash('error', 'Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)');
            return res.redirect('/register');
        }
        
        // Create new property owner
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: password,
            userType: 'property_owner',
            propertyOwnerProfile: {
                company: company || '',
                rcNumber: rcNumber || '',
                verified: false
            },
            preferences: {
                emailInquiries: true,
                emailTransactions: true,
                weeklyNewsletter: newsletter === 'on',
                marketingEmails: newsletter === 'on'
            }
        });
        
        await user.save();
        
        console.log(`✅ Property owner registered successfully: ${user.email}`);
        
        // Send welcome email (non-blocking with error handling)
        try {
            await emailService.sendWelcomeEmailToPropertyOwner(user);
            console.log('Welcome email sent successfully');
        } catch (emailError) {
            console.error('Email sending error (non-critical):', emailError.message);
        }
        
        req.flash('success', 'Registration successful! Please login to your account.');
        res.redirect('/login');
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            req.flash('error', 'Email already registered. Please use a different email.');
        } else {
            req.flash('error', 'Registration failed. Please try again.');
        }
        res.redirect('/register');
    }
};

// ============= BUSINESS PARTNER REGISTRATION (PAYMENT REQUIRED) =============

// Business Partner registration page (GET)
exports.getBusinessPartnerRegister = (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('business-partner-register', { 
        title: 'Become a Business Partner - RevaampAPA',
        currentPath: '/business-partner/register'
    });
};

// Business Partner registration handler (POST)
exports.postBusinessPartnerRegister = async (req, res) => {
    try {
        const { 
            name, email, phone, password, confirmPassword, 
            socialHandle, experience, 
            paymentReference, paymentAmount, paymentDate 
        } = req.body;
        
        console.log('Business Partner registration attempt:', { name, email, phone });
        
        // Validation
        if (!name || !email || !phone || !password) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('/business-partner/register');
        }
        
        // Check if passwords match
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/business-partner/register');
        }
        
        // Check password length
        if (password.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/business-partner/register');
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            req.flash('error', 'Email already registered. Please login instead.');
            return res.redirect('/business-partner/register');
        }
        
        // Validate Nigerian phone number
        const phoneRegex = /^(0|\+234)[7-9][0-1]\d{8}$/;
        if (!phoneRegex.test(phone)) {
            req.flash('error', 'Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)');
            return res.redirect('/business-partner/register');
        }
        
        // Validate payment proof
        if (!paymentReference || !paymentAmount || !req.file) {
            req.flash('error', 'Please provide payment proof (reference number, amount, and upload receipt)');
            return res.redirect('/business-partner/register');
        }
        
        if (parseFloat(paymentAmount) !== 20000) {
            req.flash('error', 'Payment amount must be ₦20,000');
            return res.redirect('/business-partner/register');
        }
        
        // Create new business partner with pending payment
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: password,
            userType: 'business_partner',
            businessPartnerProfile: {
                isApproved: false,
                registrationDate: new Date(),
                socialHandle: socialHandle || '',
                experience: experience || '',
                totalEarnings: 0,
                pendingWithdrawal: 0,
                paymentStatus: 'pending',
                paymentReference: paymentReference,
                paymentAmount: 20000,
                paymentDate: paymentDate || new Date(),
                paymentProofUrl: '/uploads/payments/' + req.file.filename
            },
            preferences: {
                emailInquiries: true,
                emailTransactions: true,
                weeklyNewsletter: false,
                marketingEmails: false
            }
        });
        
        // Generate unique referral link
        user.generateUniqueLink();
        
        await user.save();
        
        console.log(`✅ Business Partner registered with pending payment: ${user.email}`);
        
        // Send welcome email
        try {
            const emailService = require('../utils/email');
            await emailService.sendWelcomeEmailToBusinessPartner(user);
        } catch (emailError) {
            console.error('Email error:', emailError.message);
        }
        
        req.flash('success', 'Registration submitted! Your payment is pending verification. You will be notified once confirmed.');
        res.redirect('/login');
        
    } catch (error) {
        console.error('Business Partner registration error:', error);
        
        if (error.code === 11000) {
            req.flash('error', 'Email already registered. Please use a different email.');
        } else {
            req.flash('error', 'Registration failed. Please try again.');
        }
        res.redirect('/business-partner/register');
    }
};

// ============= PROMOTER REGISTRATION HANDLERS =============

// Promoter registration page
exports.getPromoterRegister = (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('promoter-register', { 
        title: 'Become a Promoter - RevaampAP',
        currentPath: '/promoter/register'
    });
};

// Promoter registration handler
exports.postPromoterRegister = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword, socialHandle, experience } = req.body;
        
        console.log('Promoter registration attempt:', { name, email, phone });
        
        // Validation
        if (!name || !email || !phone || !password) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('/promoter/register');
        }
        
        // Check if passwords match
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/promoter/register');
        }
        
        // Check password length
        if (password.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/promoter/register');
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            req.flash('error', 'Email already registered. Please login instead.');
            return res.redirect('/promoter/register');
        }
        
        // Validate Nigerian phone number
        const phoneRegex = /^(0|\+234)[7-9][0-1]\d{8}$/;
        if (!phoneRegex.test(phone)) {
            req.flash('error', 'Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)');
            return res.redirect('/promoter/register');
        }
        
        // Create new promoter
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: password,
            userType: 'promoter',
            promoterProfile: {
                isApproved: true,
                registrationDate: new Date(),
                socialHandle: socialHandle || '',
                experience: experience || '',
                totalEarnings: 0,
                pendingWithdrawal: 0
            },
            preferences: {
                emailInquiries: true,
                emailTransactions: true,
                weeklyNewsletter: false,
                marketingEmails: false
            }
        });
        
        // Generate unique referral link
        if (typeof user.generateUniqueLink === 'function') {
            user.generateUniqueLink();
        }
        
        await user.save();
        
        console.log(`✅ Promoter registered successfully: ${user.email}`);
        
        // Send welcome email (non-blocking with error handling)
        try {
            await emailService.sendWelcomeEmailToPromoter(user);
            console.log('Welcome email sent successfully');
        } catch (emailError) {
            console.error('Email sending error (non-critical):', emailError.message);
        }
        
        req.flash('success', 'Registration successful! You can now login to your promoter dashboard and start earning.');
        res.redirect('/login');
        
    } catch (error) {
        console.error('Promoter registration error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            req.flash('error', 'Email already registered. Please use a different email.');
        } else {
            req.flash('error', 'Registration failed: ' + error.message);
        }
        res.redirect('/promoter/register');
    }
};

// ============= DASHBOARD REDIRECT =============

// Dashboard redirect based on user type
exports.getDashboard = async (req, res) => {
    try {
        // Check if user is logged in
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
        
        // Redirect based on user type
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
};

// ============= PROFILE MANAGEMENT =============

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, company, address } = req.body;
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/dashboard');
        }
        
        user.name = name;
        user.phone = phone;
        
        if (user.userType === 'property_owner' && user.propertyOwnerProfile) {
            user.propertyOwnerProfile.company = company;
            user.propertyOwnerProfile.address = address;
        }
        
        await user.save();
        
        req.flash('success', 'Profile updated successfully');
        res.redirect('/dashboard/settings');
    } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/dashboard/settings');
    }
};

// Update profile image
exports.updateProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error', 'No image uploaded');
            return res.redirect('/dashboard/settings');
        }
        
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/dashboard');
        }
        
        // Delete old profile image if exists
        if (user.profileImage && user.profileImage !== 'default-avatar.jpg') {
            const oldImagePath = path.join(__dirname, '../public/uploads/profiles', user.profileImage);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }
        
        user.profileImage = req.file.filename;
        await user.save();
        
        req.flash('success', 'Profile picture updated successfully');
        res.redirect('/dashboard/settings');
    } catch (error) {
        console.error('Update profile image error:', error);
        req.flash('error', 'Error updating profile picture');
        res.redirect('/dashboard/settings');
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/dashboard/settings');
        }
        
        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/dashboard/settings');
        }
        
        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/dashboard/settings');
        }
        
        // Check password length
        if (newPassword.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/dashboard/settings');
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        req.flash('success', 'Password changed successfully');
        res.redirect('/dashboard/settings');
    } catch (error) {
        console.error('Change password error:', error);
        req.flash('error', 'Error changing password');
        res.redirect('/dashboard/settings');
    }
};

// ============= PASSWORD RESET HANDLERS =============

// Forgot password page
exports.getForgotPassword = (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('forgot-password', {
        title: 'Forgot Password - RevaampAP'
    });
};

// Forgot password handler
exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            req.flash('error', 'No account found with that email address');
            return res.redirect('/forgot-password');
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        
        // Send reset email
        try {
            await emailService.sendPasswordResetEmail(user, resetToken);
        } catch (emailError) {
            console.error('Email error:', emailError.message);
        }
        
        req.flash('success', 'Password reset link sent to your email. Please check your inbox.');
        res.redirect('/login');
    } catch (error) {
        console.error('Forgot password error:', error);
        req.flash('error', 'Error sending reset email. Please try again.');
        res.redirect('/forgot-password');
    }
};

// Reset password page
exports.getResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired');
            return res.redirect('/forgot-password');
        }
        
        res.render('reset-password', {
            title: 'Reset Password - RevaampAP',
            token: token
        });
    } catch (error) {
        console.error('Get reset password error:', error);
        req.flash('error', 'Error loading reset page');
        res.redirect('/forgot-password');
    }
};

// Reset password handler
exports.postResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect(`/reset-password/${token}`);
        }
        
        if (password.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect(`/reset-password/${token}`);
        }
        
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired');
            return res.redirect('/forgot-password');
        }
        
        // Update password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        
        req.flash('success', 'Password has been reset successfully. Please login with your new password.');
        res.redirect('/login');
    } catch (error) {
        console.error('Reset password error:', error);
        req.flash('error', 'Error resetting password. Please try again.');
        res.redirect('/forgot-password');
    }
};

// ============= VERIFICATION CALLBACK =============

// Payment verification callback
exports.verificationCallback = async (req, res) => {
    try {
        const { reference } = req.query;
        
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        });
        
        if (response.data.data.status === 'success') {
            const { propertyId, userId } = response.data.data.metadata;
            
            const Property = require('../models/Property');
            await Property.findByIdAndUpdate(propertyId, {
                verificationStatus: 'payment_confirmed',
                status: 'payment_confirmed',
                verificationPaymentReference: reference,
                verificationPaymentDate: new Date(),
                verificationPaymentConfirmed: true
            });
            
            req.flash('success', 'Payment successful! Your property is now pending admin verification.');
            return res.redirect('/dashboard');
        }
        
        req.flash('error', 'Payment verification failed');
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Verification callback error:', error);
        req.flash('error', 'Payment verification failed');
        res.redirect('/dashboard');
    }
};

// ============= LOGOUT =============

// Logout handler
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
};

// ============= PROJECT SUBSCRIBER REGISTRATION =============

// Project Subscriber registration page
exports.getProjectSubscriberRegister = (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('project-subscriber-register', { 
        title: 'Register as Project Management Subscriber - RevaampAP',
        currentPath: '/project-subscriber/register'
    });
};

// Project Subscriber registration handler
exports.postProjectSubscriberRegister = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword, countryOfResidence, passportNumber } = req.body;
        
        console.log('Project Subscriber registration attempt:', { name, email, phone });
        
        // Validation
        if (!name || !email || !phone || !password) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('/project-subscriber/register');
        }
        
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/project-subscriber/register');
        }
        
        if (password.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/project-subscriber/register');
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            req.flash('error', 'Email already registered. Please login instead.');
            return res.redirect('/project-subscriber/register');
        }
        
        // Validate phone number
        const phoneRegex = /^(0|\+234)[7-9][0-1]\d{8}$/;
        if (!phoneRegex.test(phone)) {
            req.flash('error', 'Please enter a valid Nigerian phone number');
            return res.redirect('/project-subscriber/register');
        }
        
        // Create new project subscriber
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: password,
            userType: 'project_subscriber',
            projectSubscriberProfile: {
                isApproved: false,
                subscriptionStatus: 'inactive',
                countryOfResidence: countryOfResidence,
                passportNumber: passportNumber,
                totalProjects: 0,
                totalProjectValue: 0
            },
            preferences: {
                emailInquiries: true,
                emailTransactions: true,
                weeklyNewsletter: true,
                marketingEmails: true
            }
        });
        
        await user.save();
        
        console.log(`✅ Project Subscriber registered successfully: ${user.email}`);
        
        // Send welcome email
        try {
            await emailService.sendWelcomeEmailToProjectSubscriber(user);
        } catch (emailError) {
            console.error('Email error:', emailError.message);
        }
        
        req.flash('success', 'Registration successful! Please login to complete your subscription and bank guarantee verification.');
        res.redirect('/login');
        
    } catch (error) {
        console.error('Project Subscriber registration error:', error);
        
        if (error.code === 11000) {
            req.flash('error', 'Email already registered. Please use a different email.');
        } else {
            req.flash('error', 'Registration failed. Please try again.');
        }
        res.redirect('/project-subscriber/register');
    }
};

// ============= PENDING PAGE =============

// Agent pending page (redirect to dashboard)
exports.agentPending = (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.redirect('/login');
};