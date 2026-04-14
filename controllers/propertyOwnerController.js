// controllers/propertyOwnerController.js
const Property = require('../models/Property');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Promotion = require('../models/Promotion');
const axios = require('axios');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Helper function to get base URL
function getBaseUrl(req) {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    return `${req.protocol}://${req.get('host')}`;
}

// ============= PAGE ROUTES =============

// Property Owner Dashboard
exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        // Get owner's properties
        const properties = await Property.find({ owner: user._id }).sort('-createdAt');
        
        // Calculate statistics
        const totalProperties = properties.length;
        const pendingPayment = properties.filter(p => p.verificationStatus === 'pending_payment').length;
        const underReview = properties.filter(p => p.verificationStatus === 'verification_pending').length;
        const verified = properties.filter(p => p.verificationStatus === 'verified').length;
        const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalPropertiesValue = properties.reduce((sum, p) => sum + p.price, 0);
        
        const stats = {
            totalProperties,
            pendingPayment,
            underReview,
            verified,
            totalViews,
            totalPropertiesValue
        };
        
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const totalPages = Math.ceil(properties.length / limit);
        const paginatedProperties = properties.slice((page - 1) * limit, page * limit);
        
        res.render('property-owner/dashboard', {
            title: 'Property Owner Dashboard - RevaampAP',
            user: user,
            properties: paginatedProperties,
            stats: stats,
            currentPage: page,
            totalPages: totalPages || 1,
            currentPath: '/dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
};

// Show add property form
exports.getAddProperty = (req, res) => {
    res.render('property-owner/add-property', {
        title: 'Add New Property - RevaampAP',
        property: null,
        verificationFee: 20000
    });
};

// Process add property
exports.postAddProperty = async (req, res) => {
    try {
        const {
            title, description, propertyType, transactionType,
            price, priceNegotiable,
            address, city, state, lga, landmark,
            bedrooms, bathrooms, toilets, parkingSpaces,
            floorArea, landArea,
            furnished, serviced, security, powerSupply, borehole
        } = req.body;
        
        console.log('Adding property for user:', req.session.userId);
        
        // Generate slug
        const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();
        
        // Process images
        const images = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                images.push({
                    url: '/uploads/' + file.filename,
                    isPrimary: index === 0
                });
            });
        }
        
        // Process document uploads
        const documents = [];
        if (req.body.documentTypes && req.files) {
            // Handle document uploads separately
            // This would need a separate file input for documents
        }
        
        // Calculate agency fee (10% of price)
        const agencyFee = parseFloat(price) * 0.1;
        
        // Create property with pending payment status
        const property = new Property({
            title,
            slug,
            description,
            propertyType,
            transactionType,
            price: parseFloat(price),
            priceNegotiable: priceNegotiable === 'on',
            location: { address, city, state, lga, landmark },
            features: {
                bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
                bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
                toilets: toilets ? parseInt(toilets) : undefined,
                parkingSpaces: parkingSpaces ? parseInt(parkingSpaces) : undefined,
                floorArea: floorArea ? parseFloat(floorArea) : undefined,
                landArea: landArea ? parseFloat(landArea) : undefined,
                furnished: furnished === 'on',
                serviced: serviced === 'on',
                security: security === 'on',
                powerSupply: powerSupply === 'on',
                borehole: borehole === 'on'
            },
            images,
            documents,
            owner: req.session.userId,
            ownerType: 'property_owner',
            agencyFee,
            verificationStatus: 'pending_payment',
            status: 'pending_payment',
            verificationFee: 20000
        });
        
        await property.save();
        
        // Store property ID in session for payment
        req.session.pendingPropertyPayment = {
            propertyId: property._id,
            amount: 20000
        };
        
        req.flash('info', 'Please pay the verification fee of ₦20,000 to proceed with property verification.');
        res.redirect(`/properties/pay-verification/${property._id}`);
    } catch (error) {
        console.error('Add property error:', error);
        req.flash('error', 'Error adding property. Please try again.');
        res.redirect('/properties/add');
    }
};

// Pay verification fee page
exports.getPayVerification = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            req.flash('error', 'Property not found');
            return res.redirect('/dashboard');
        }
        
        if (property.owner.toString() !== req.session.userId) {
            req.flash('error', 'Unauthorized');
            return res.redirect('/dashboard');
        }
        
        if (property.verificationStatus !== 'pending_payment') {
            req.flash('error', 'Payment already processed for this property');
            return res.redirect('/dashboard');
        }
        
        res.render('property-owner/pay-verification', {
            title: 'Pay Verification Fee - RevaampAP',
            property,
            feeAmount: 20000
        });
    } catch (error) {
        console.error('Get pay verification error:', error);
        req.flash('error', 'Error loading payment page');
        res.redirect('/dashboard');
    }
};

// Process verification payment
exports.processVerificationPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const property = await Property.findById(id);
        
        if (!property) {
            req.flash('error', 'Property not found');
            return res.redirect('/dashboard');
        }
        
        if (property.owner.toString() !== req.session.userId) {
            req.flash('error', 'Unauthorized');
            return res.redirect('/dashboard');
        }
        
        // Initialize Paystack payment
        const response = await axios.post('https://api.paystack.co/transaction/initialize', {
            email: req.session.userEmail,
            amount: 20000 * 100, // Paystack uses kobo
            callback_url: `${getBaseUrl(req)}/properties/verification-callback`,
            metadata: {
                propertyId: property._id,
                purpose: 'property_verification',
                userId: req.session.userId,
                amount: 20000
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
        console.error('Process verification payment error:', error);
        req.flash('error', 'Error processing payment. Please try again.');
        res.redirect(`/properties/pay-verification/${req.params.id}`);
    }
};

// Verification payment callback
exports.verificationCallback = async (req, res) => {
    try {
        const { reference } = req.query;
        
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        });
        
        if (response.data.data.status === 'success') {
            const { propertyId, userId } = response.data.data.metadata;
            
            // Update property with payment confirmation
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

// Edit property
exports.getEditProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            req.flash('error', 'Property not found');
            return res.redirect('/dashboard');
        }
        
        if (property.owner.toString() !== req.session.userId) {
            req.flash('error', 'Unauthorized');
            return res.redirect('/dashboard');
        }
        
        res.render('property-owner/add-property', {
            title: 'Edit Property - RevaampAP',
            property,
            verificationFee: 20000
        });
    } catch (error) {
        console.error('Edit property error:', error);
        req.flash('error', 'Error loading property');
        res.redirect('/dashboard');
    }
};

// Update property
exports.updateProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            req.flash('error', 'Property not found');
            return res.redirect('/dashboard');
        }
        
        if (property.owner.toString() !== req.session.userId) {
            req.flash('error', 'Unauthorized');
            return res.redirect('/dashboard');
        }
        
        // Only allow editing if property is not yet verified or is rejected
        if (property.verificationStatus === 'verified') {
            req.flash('error', 'Cannot edit verified property. Contact admin for changes.');
            return res.redirect('/dashboard');
        }
        
        const {
            title, description, propertyType, transactionType,
            price, priceNegotiable,
            address, city, state, lga, landmark,
            bedrooms, bathrooms, toilets, parkingSpaces,
            floorArea, landArea,
            furnished, serviced, security, powerSupply, borehole,
            removeImages
        } = req.body;
        
        // Update slug if title changed
        if (title !== property.title) {
            property.slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();
        }
        
        // Handle image removal
        if (removeImages) {
            const imagesToRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
            imagesToRemove.forEach(imageUrl => {
                const filename = path.basename(imageUrl);
                const filepath = path.join(__dirname, '../public/uploads', filename);
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            });
            property.images = property.images.filter(img => !imagesToRemove.includes(img.url));
        }
        
        // Add new images
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                property.images.push({
                    url: '/uploads/' + file.filename,
                    isPrimary: property.images.length === 0
                });
            });
        }
        
        // Update fields
        property.title = title;
        property.description = description;
        property.propertyType = propertyType;
        property.transactionType = transactionType;
        property.price = parseFloat(price);
        property.priceNegotiable = priceNegotiable === 'on';
        property.location = { address, city, state, lga, landmark };
        property.features = {
            bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
            bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
            toilets: toilets ? parseInt(toilets) : undefined,
            parkingSpaces: parkingSpaces ? parseInt(parkingSpaces) : undefined,
            floorArea: floorArea ? parseFloat(floorArea) : undefined,
            landArea: landArea ? parseFloat(landArea) : undefined,
            furnished: furnished === 'on',
            serviced: serviced === 'on',
            security: security === 'on',
            powerSupply: powerSupply === 'on',
            borehole: borehole === 'on'
        };
        
        if (parseFloat(price) !== property.price) {
            property.agencyFee = parseFloat(price) * 0.1;
        }
        
        await property.save();
        
        req.flash('success', 'Property updated successfully!');
        res.redirect(`/dashboard`);
    } catch (error) {
        console.error('Update property error:', error);
        req.flash('error', 'Error updating property');
        res.redirect(`/properties/${req.params.id}/edit`);
    }
};

// Delete property
exports.deleteProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            req.flash('error', 'Property not found');
            return res.redirect('/dashboard');
        }
        
        if (property.owner.toString() !== req.session.userId && req.session.userType !== 'superadmin') {
            req.flash('error', 'Unauthorized');
            return res.redirect('/dashboard');
        }
        
        // Remove images from filesystem
        property.images.forEach(image => {
            const filename = path.basename(image.url);
            const filepath = path.join(__dirname, '../public/uploads', filename);
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        });
        
        await property.deleteOne();
        
        req.flash('success', 'Property deleted successfully');
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Delete property error:', error);
        req.flash('error', 'Error deleting property');
        res.redirect('/dashboard');
    }
};

// Get property details (for owner view)
exports.getPropertyDetails = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const property = await Property.findById(req.params.id).populate('owner', 'name email phone');
        
        if (!property) {
            req.flash('error', 'Property not found');
            return res.redirect('/dashboard');
        }
        
        // Check if user owns the property or is admin
        if (property.owner._id.toString() !== req.session.userId && req.session.userType !== 'superadmin') {
            req.flash('error', 'Unauthorized');
            return res.redirect('/dashboard');
        }
        
        res.render('property-owner/property-detail', {
            title: `${property.title} - RevaampAP`,
            user,
            property
        });
    } catch (error) {
        console.error('Get property details error:', error);
        req.flash('error', 'Error loading property details');
        res.redirect('/dashboard');
    }
};

// Get earnings page
exports.getEarnings = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const properties = await Property.find({ owner: user._id });
        
        const transactions = await Transaction.find({
            property: { $in: properties.map(p => p._id) },
            paymentStatus: 'completed'
        }).populate('property', 'title').sort('-transactionDate');
        
        const totalEarnings = transactions.reduce((sum, t) => 
            sum + (t.commissionSplit?.propertyOwner?.amount || 0), 0);
        
        // Monthly earnings for last 6 months
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const monthTransactions = transactions.filter(t => {
                const tDate = new Date(t.transactionDate);
                return tDate >= monthStart && tDate <= monthEnd;
            });
            
            const monthTotal = monthTransactions.reduce((sum, t) => 
                sum + (t.commissionSplit?.propertyOwner?.amount || 0), 0);
            monthlyData.push({
                month: date.toLocaleString('default', { month: 'short' }),
                earnings: monthTotal
            });
        }
        
        res.render('property-owner/earnings', {
            title: 'My Earnings - RevaampAP',
            user,
            transactions,
            totalEarnings,
            monthlyData
        });
    } catch (error) {
        console.error('Get earnings error:', error);
        req.flash('error', 'Error loading earnings');
        res.redirect('/dashboard');
    }
};

// Get settings page
exports.getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('property-owner/settings', {
            title: 'Settings - RevaampAP',
            user
        });
    } catch (error) {
        console.error('Get settings error:', error);
        req.flash('error', 'Error loading settings');
        res.redirect('/dashboard');
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, company, address } = req.body;
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        user.name = name;
        user.phone = phone;
        if (user.userType === 'property_owner') {
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

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/dashboard/settings');
        }
        
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/dashboard/settings');
        }
        
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/dashboard/settings');
        }
        
        if (newPassword.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/dashboard/settings');
        }
        
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