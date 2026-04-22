// controllers/inquiryController.js
const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');
const User = require('../models/User');

// ============= PUBLIC API =============
exports.submitInquiry = async (req, res) => {
    console.log('=== INQUIRY SUBMISSION RECEIVED ===');
    console.log('Request body:', req.body);
    console.log('Session user:', req.session.userId);
    
    try {
        const { propertyId, name, email, phone, message } = req.body;
        
        // Detailed validation
        const errors = [];
        
        if (!propertyId) {
            errors.push('Property ID is required');
        }
        
        if (!name || name.trim() === '') {
            errors.push('Name is required');
        }
        
        if (!email || email.trim() === '') {
            errors.push('Email is required');
        } else if (!/^\S+@\S+\.\S+$/.test(email)) {
            errors.push('Please enter a valid email address');
        }
        
        if (!message || message.trim() === '') {
            errors.push('Message is required');
        }
        
        if (errors.length > 0) {
            console.log('Validation errors:', errors);
            return res.status(400).json({ 
                success: false, 
                message: errors.join(', ')
            });
        }
        
        // Get property details
        const property = await Property.findById(propertyId);
        
        if (!property) {
            console.log('Property not found:', propertyId);
            return res.status(404).json({ 
                success: false, 
                message: 'Property not found' 
            });
        }
        
        console.log('Property found:', property.title);
        
        // Create inquiry
        const inquiry = new Inquiry({
            property: propertyId,
            propertyOwner: property.owner,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone || '',
            message: message.trim(),
            user: req.session.userId || null,
            status: 'new',
            isRead: false
        });
        
        await inquiry.save();
        console.log('Inquiry saved successfully with ID:', inquiry._id);
        
        // Return success response
        res.status(200).json({ 
            success: true, 
            message: 'Inquiry sent successfully! The property owner will contact you soon.',
            inquiryId: inquiry._id
        });
        
    } catch (error) {
        console.error('Submit inquiry error:', error);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({ 
            success: false, 
            message: 'Error sending inquiry. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============= PROPERTY OWNER METHODS =============
exports.getOwnerInquiries = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { status, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = { propertyOwner: req.session.userId };
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const inquiries = await Inquiry.find(query)
            .populate('property', 'title slug price location')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await Inquiry.countDocuments(query);
        
        const stats = {
            total: await Inquiry.countDocuments({ propertyOwner: req.session.userId }),
            new: await Inquiry.countDocuments({ propertyOwner: req.session.userId, status: 'new' }),
            read: await Inquiry.countDocuments({ propertyOwner: req.session.userId, status: 'read' }),
            replied: await Inquiry.countDocuments({ propertyOwner: req.session.userId, status: 'replied' })
        };
        
        res.render('property-owner/inquiries', {
            title: 'Property Inquiries - RevaampAP',
            user: user,
            inquiries: inquiries,
            stats: stats,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total: total,
            filters: req.query,
            currentPath: '/property-owner/inquiries'
        });
    } catch (error) {
        console.error('Get owner inquiries error:', error);
        req.flash('error', 'Error loading inquiries');
        res.redirect('/property-owner/dashboard');
    }
};

exports.getInquiryDetails = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const inquiry = await Inquiry.findById(req.params.id)
            .populate('property', 'title slug price location images description')
            .populate('propertyOwner', 'name email phone')
            .populate('repliedBy', 'name')
            .populate('notes.addedBy', 'name');
        
        if (!inquiry) {
            req.flash('error', 'Inquiry not found');
            return res.redirect('/property-owner/inquiries');
        }
        
        // Check if the inquiry belongs to this property owner
        if (inquiry.propertyOwner._id.toString() !== req.session.userId) {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/property-owner/inquiries');
        }
        
        // Mark as read if not already
        if (!inquiry.isRead) {
            inquiry.isRead = true;
            inquiry.readAt = new Date();
            inquiry.status = 'read';
            await inquiry.save();
        }
        
        res.render('property-owner/inquiry-detail', {
            title: `Inquiry: ${inquiry.name} - ${inquiry.property.title}`,
            user: user,
            inquiry: inquiry,
            currentPath: '/property-owner/inquiries'
        });
    } catch (error) {
        console.error('Get inquiry details error:', error);
        req.flash('error', 'Error loading inquiry details');
        res.redirect('/property-owner/inquiries');
    }
};

exports.replyToInquiry = async (req, res) => {
    try {
        const { replyMessage } = req.body;
        const inquiry = await Inquiry.findById(req.params.id);
        
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }
        
        // Check authorization
        if (inquiry.propertyOwner.toString() !== req.session.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        
        if (!replyMessage) {
            return res.status(400).json({ success: false, message: 'Reply message is required' });
        }
        
        inquiry.replyMessage = replyMessage;
        inquiry.repliedAt = new Date();
        inquiry.repliedBy = req.session.userId;
        inquiry.status = 'replied';
        await inquiry.save();
        
        res.json({ success: true, message: 'Reply sent successfully' });
        
    } catch (error) {
        console.error('Reply to inquiry error:', error);
        res.status(500).json({ success: false, message: 'Error sending reply' });
    }
};

exports.addNote = async (req, res) => {
    try {
        const { note } = req.body;
        const inquiry = await Inquiry.findById(req.params.id);
        
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }
        
        // Check authorization
        if (inquiry.propertyOwner.toString() !== req.session.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        
        inquiry.notes.push({
            note: note,
            addedBy: req.session.userId,
            addedAt: new Date()
        });
        
        await inquiry.save();
        
        res.json({ success: true, message: 'Note added successfully' });
        
    } catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({ success: false, message: 'Error adding note' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const inquiry = await Inquiry.findById(req.params.id);
        
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }
        
        // Check authorization
        if (inquiry.propertyOwner.toString() !== req.session.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        
        inquiry.status = status;
        if (status === 'read' && !inquiry.readAt) {
            inquiry.readAt = new Date();
            inquiry.isRead = true;
        }
        await inquiry.save();
        
        res.json({ success: true, message: 'Status updated successfully' });
        
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, message: 'Error updating status' });
    }
};

// ============= SUPERADMIN METHODS =============
exports.getAllInquiries = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { status, propertyId, search, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (propertyId) {
            query.property = propertyId;
        }
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } }
            ];
        }
        
        const inquiries = await Inquiry.find(query)
            .populate('property', 'title slug price location')
            .populate('propertyOwner', 'name email')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await Inquiry.countDocuments(query);
        
        const stats = {
            total: await Inquiry.countDocuments(),
            new: await Inquiry.countDocuments({ status: 'new' }),
            read: await Inquiry.countDocuments({ status: 'read' }),
            replied: await Inquiry.countDocuments({ status: 'replied' }),
            archived: await Inquiry.countDocuments({ status: 'archived' }),
            spam: await Inquiry.countDocuments({ status: 'spam' })
        };
        
        const properties = await Property.find({ verificationStatus: 'verified' })
            .select('title')
            .limit(100);
        
        res.render('superadmin/inquiries', {
            title: 'All Inquiries - RevaampAP',
            user: user,
            inquiries: inquiries,
            stats: stats,
            properties: properties,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total: total,
            filters: req.query,
            currentPath: '/superadmin/inquiries'
        });
    } catch (error) {
        console.error('Get all inquiries error:', error);
        req.flash('error', 'Error loading inquiries');
        res.redirect('/superadmin/dashboard');
    }
};

exports.getAdminInquiryDetails = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const inquiry = await Inquiry.findById(req.params.id)
            .populate('property', 'title slug price location images description')
            .populate('propertyOwner', 'name email phone')
            .populate('repliedBy', 'name')
            .populate('notes.addedBy', 'name');
        
        if (!inquiry) {
            req.flash('error', 'Inquiry not found');
            return res.redirect('/superadmin/inquiries');
        }
        
        res.render('superadmin/inquiry-detail', {
            title: `Inquiry Details - ${inquiry.name}`,
            user: user,
            inquiry: inquiry,
            currentPath: '/superadmin/inquiries'
        });
    } catch (error) {
        console.error('Get admin inquiry details error:', error);
        req.flash('error', 'Error loading inquiry details');
        res.redirect('/superadmin/inquiries');
    }
};

exports.deleteInquiry = async (req, res) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id);
        
        if (!inquiry) {
            return res.status(404).json({ success: false, message: 'Inquiry not found' });
        }
        
        await inquiry.deleteOne();
        
        res.json({ success: true, message: 'Inquiry deleted successfully' });
        
    } catch (error) {
        console.error('Delete inquiry error:', error);
        res.status(500).json({ success: false, message: 'Error deleting inquiry' });
    }
};

exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { inquiryIds, status } = req.body;
        
        if (!inquiryIds || !inquiryIds.length) {
            return res.status(400).json({ success: false, message: 'No inquiries selected' });
        }
        
        const validStatuses = ['new', 'read', 'replied', 'archived', 'spam'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        
        const result = await Inquiry.updateMany(
            { _id: { $in: inquiryIds } },
            { status: status }
        );
        
        res.json({ success: true, message: `${result.modifiedCount} inquiries updated successfully` });
        
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ success: false, message: 'Error updating inquiries' });
    }
};

exports.exportInquiries = async (req, res) => {
    try {
        const { status } = req.query;
        
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const inquiries = await Inquiry.find(query)
            .populate('property', 'title')
            .populate('propertyOwner', 'name email')
            .sort('-createdAt');
        
        const csvHeaders = ['Date', 'Name', 'Email', 'Phone', 'Property', 'Property Owner', 'Message', 'Status', 'Replied At'];
        const csvRows = [csvHeaders];
        
        inquiries.forEach(inquiry => {
            csvRows.push([
                inquiry.createdAt.toLocaleDateString(),
                `"${inquiry.name}"`,
                inquiry.email,
                inquiry.phone || '',
                `"${inquiry.property?.title || 'N/A'}"`,
                `"${inquiry.propertyOwner?.name || 'N/A'}"`,
                `"${inquiry.message.replace(/"/g, '""')}"`,
                inquiry.status,
                inquiry.repliedAt ? inquiry.repliedAt.toLocaleDateString() : ''
            ]);
        });
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=inquiries-${Date.now()}.csv`);
        res.send(csvContent);
        
    } catch (error) {
        console.error('Export inquiries error:', error);
        res.status(500).json({ success: false, message: 'Error exporting inquiries' });
    }
};