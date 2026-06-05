// controllers/propertyController.js
const Property = require('../models/Property');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Get all properties (public)
exports.getAllProperties = async (req, res) => {
    try {
        const { propertyType, transactionType, state, search, page = 1 } = req.query;
        
        let query = { 
            verificationStatus: 'verified',
            status: 'available' 
        };
        
        if (propertyType && propertyType !== '') query.propertyType = propertyType;
        if (transactionType && transactionType !== '') query.transactionType = transactionType;
        if (state && state !== '') query['location.state'] = state;
        
        if (search && search !== '') {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'location.city': { $regex: search, $options: 'i' } },
                { 'location.state': { $regex: search, $options: 'i' } }
            ];
        }
        
        const limit = 12;
        const skip = (page - 1) * limit;
        
        const properties = await Property.find(query)
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await Property.countDocuments(query);
        
        res.render('properties/index', {
            title: 'Properties - RevaampAP',
            properties,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total,
            filters: req.query,
            user: req.session.userId ? { name: req.session.userName } : null,
            host: req.get('host')
        });
    } catch (error) {
        console.error('Get properties error:', error);
        res.status(500).send('Error loading properties');
    }
};

// Get single property detail (public)
exports.getPropertyDetail = async (req, res) => {
    try {
        const { slug } = req.params;
        
        const property = await Property.findOneAndUpdate(
            { slug, verificationStatus: 'verified' },
            { $inc: { views: 1 } },
            { new: true }
        ).populate('owner', 'name email phone');
        
        if (!property) {
            return res.status(404).send('Property not found');
        }
        
        res.render('properties/detail', {
            title: `${property.title} - RevaampAP`,
            property,
            user: req.session.userId ? { name: req.session.userName } : null,
            host: req.get('host')
        });
    } catch (error) {
        console.error('Property detail error:', error);
        res.status(500).send('Error loading property');
    }
};

// Get add property form (with TinyMCE)
exports.getAddProperty = async (req, res) => {
    try {
        res.render('property-owner/add-property', {
            title: 'Add New Property - RevaampAP',
            property: null,
            verificationFee: 20000,
            user: req.session.userId ? { name: req.session.userName } : null
        });
    } catch (error) {
        console.error('Get add property error:', error);
        res.redirect('/dashboard');
    }
};

// Post add property (with TinyMCE content)
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
        
        const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();
        
        const images = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                images.push({
                    url: '/uploads/properties/' + file.filename,
                    isPrimary: index === 0
                });
            });
        }
        
        const agencyFee = parseFloat(price) * 0.1;
        
        const property = new Property({
            title,
            slug,
            description, // Now supports HTML from TinyMCE
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
            owner: req.session.userId,
            ownerType: 'property_owner',
            agencyFee,
            verificationStatus: 'pending_payment',
            status: 'pending_payment',
            verificationFee: 20000
        });
        
        await property.save();
        
        req.flash('info', 'Please pay the verification fee of ₦20,000 to proceed.');
        res.redirect(`/properties/pay-verification/${property._id}`);
    } catch (error) {
        console.error('Add property error:', error);
        req.flash('error', 'Error adding property');
        res.redirect('/properties/add');
    }
};

// Get edit property form (with TinyMCE)
exports.getEditProperty = async (req, res) => {
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
        
        res.render('property-owner/add-property', {
            title: 'Edit Property - RevaampAP',
            property,
            verificationFee: 20000,
            user: req.session.userId ? { name: req.session.userName } : null
        });
    } catch (error) {
        console.error('Edit property error:', error);
        res.redirect('/dashboard');
    }
};

// Update property (with TinyMCE)
exports.updateProperty = async (req, res) => {
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
        
        const {
            title, description, propertyType, transactionType,
            price, priceNegotiable,
            address, city, state, lga, landmark,
            bedrooms, bathrooms, toilets, parkingSpaces,
            floorArea, landArea,
            furnished, serviced, security, powerSupply, borehole
        } = req.body;
        
        if (title !== property.title) {
            property.slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();
        }
        
        property.title = title;
        property.description = description; // Now supports HTML from TinyMCE
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
        
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                property.images.push({
                    url: '/uploads/properties/' + file.filename,
                    isPrimary: property.images.length === 0
                });
            });
        }
        
        await property.save();
        
        req.flash('success', 'Property updated successfully');
        res.redirect('/dashboard');
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
        
        await property.deleteOne();
        
        req.flash('success', 'Property deleted successfully');
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Delete property error:', error);
        req.flash('error', 'Error deleting property');
        res.redirect('/dashboard');
    }
};

// API methods
exports.getInquiries = async (req, res) => {
    res.json([]);
};

exports.getTransactions = async (req, res) => {
    res.json([]);
};

exports.getEarnings = async (req, res) => {
    res.json({ totalEarned: 0, monthlyEarned: 0 });
};

exports.getAnalytics = async (req, res) => {
    res.json({});
};