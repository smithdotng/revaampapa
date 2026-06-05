// controllers/propertyController.js
const Property = require('../models/Property');

// Get all properties with filtering
exports.getAllProperties = async (req, res) => {
    try {
        const { type, transactionType, state, search, minPrice, maxPrice, bedrooms, sort, page = 1 } = req.query;
        const limit = 12;
        const skip = (page - 1) * limit;
        
        let query = { 
            verificationStatus: 'verified',
            status: 'available' 
        };
        
        if (type && type !== 'all') {
            query.propertyType = type;
        }
        if (transactionType && transactionType !== 'all') {
            query.transactionType = transactionType;
        }
        if (state && state !== 'all') {
            query['location.state'] = state;
        }
        if (bedrooms) {
            query['features.bedrooms'] = { $gte: parseInt(bedrooms) };
        }
        
        // Price range
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseInt(minPrice);
            if (maxPrice) query.price.$lte = parseInt(maxPrice);
        }
        
        // Search in title and description
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'location.city': { $regex: search, $options: 'i' } },
                { 'location.state': { $regex: search, $options: 'i' } }
            ];
        }
        
        // Sort options
        let sortOption = { createdAt: -1 };
        if (sort === 'price-asc') sortOption = { price: 1 };
        if (sort === 'price-desc') sortOption = { price: -1 };
        if (sort === 'popular') sortOption = { views: -1 };
        
        const properties = await Property.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit);
        
        const total = await Property.countDocuments(query);
        
        res.render('properties/index', {
            title: 'Properties - RevaampAPA',
            properties: properties,
            total: total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            filters: req.query,
            currentPath: '/properties',
            user: req.session.userId ? { name: req.session.userName, id: req.session.userId } : null
        });
    } catch (error) {
        console.error('Get properties error:', error);
        res.render('properties/index', {
            title: 'Properties - RevaampAPA',
            properties: [],
            total: 0,
            currentPage: 1,
            totalPages: 0,
            filters: {},
            currentPath: '/properties',
            user: req.session.userId ? { name: req.session.userName, id: req.session.userId } : null
        });
    }
};

// Get single property detail
exports.getPropertyDetail = async (req, res) => {
    try {
        const { slug } = req.params;
        
        const property = await Property.findOneAndUpdate(
            { slug, verificationStatus: 'verified' },
            { $inc: { views: 1 } },
            { new: true }
        ).populate('owner', 'name email phone');
        
        if (!property) {
            return res.status(404).render('404', {
                title: 'Property Not Found - RevaampAPA',
                message: 'The property you are looking for does not exist.',
                user: req.session.userId ? { name: req.session.userName, id: req.session.userId } : null
            });
        }
        
        // Get similar properties
        const similarProperties = await Property.find({
            _id: { $ne: property._id },
            verificationStatus: 'verified',
            status: 'available',
            propertyType: property.propertyType,
            'location.state': property.location.state
        }).limit(4);
        
        res.render('properties/detail', {
            title: `${property.title} - RevaampAPA`,
            property: property,
            similarProperties: similarProperties,
            currentPath: `/properties/${slug}`,
            user: req.session.userId ? { name: req.session.userName, id: req.session.userId } : null
        });
    } catch (error) {
        console.error('Property detail error:', error);
        res.status(500).render('500', {
            title: 'Server Error - RevaampAPA',
            message: 'Error loading property details.',
            user: req.session.userId ? { name: req.session.userName, id: req.session.userId } : null
        });
    }
};