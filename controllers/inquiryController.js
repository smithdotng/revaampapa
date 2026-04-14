// controllers/inquiryController.js
const ProjectInquiry = require('../models/ProjectInquiry');
const Project = require('../models/Project');
const User = require('../models/User');

// Create a new project inquiry
exports.createProjectInquiry = async (req, res) => {
    try {
        const { projectId, name, email, phone, message } = req.body;
        
        console.log('Received inquiry:', { projectId, name, email, phone, message });
        
        // Validate required fields
        if (!projectId || !name || !email || !message) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('back');
        }
        
        // Find the project
        const project = await Project.findById(projectId);
        if (!project) {
            req.flash('error', 'Project not found');
            return res.redirect('/projects');
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.flash('error', 'Please enter a valid email address');
            return res.redirect('back');
        }
        
        // Create inquiry
        const inquiry = new ProjectInquiry({
            project: projectId,
            projectName: project.name,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone ? phone.trim() : '',
            message: message.trim()
        });
        
        await inquiry.save();
        
        console.log('Inquiry saved:', inquiry._id);
        
        req.flash('success', 'Your inquiry has been sent successfully. We will get back to you shortly.');
        res.redirect(`/projects/${project.slug}`);
    } catch (error) {
        console.error('Create project inquiry error:', error);
        req.flash('error', 'Error sending inquiry. Please try again.');
        res.redirect('back');
    }
};

// Admin: Get all project inquiries
exports.adminGetAllInquiries = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const { status, projectId, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        if (projectId) {
            query.project = projectId;
        }
        
        const inquiries = await ProjectInquiry.find(query)
            .populate('project', 'name slug')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await ProjectInquiry.countDocuments(query);
        
        // Get projects for filter
        const projects = await Project.find({ status: 'published' }).select('name');
        
        res.render('admin/project-inquiries', {
            title: 'Project Inquiries - Found',
            user,
            inquiries,
            projects,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total,
            filters: req.query,
            path: '/admin/inquiries'
        });
    } catch (error) {
        console.error('Admin get inquiries error:', error);
        req.flash('error', 'Error loading inquiries');
        res.redirect('/admin/dashboard');
    }
};

// Admin: Get single inquiry details
exports.adminGetInquiry = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const inquiry = await ProjectInquiry.findById(req.params.id)
            .populate('project', 'name slug location');
        
        if (!inquiry) {
            req.flash('error', 'Inquiry not found');
            return res.redirect('/admin/inquiries');
        }
        
        // Mark as read if not already
        if (inquiry.status === 'new') {
            inquiry.status = 'read';
            inquiry.readAt = new Date();
            await inquiry.save();
        }
        
        res.render('admin/inquiry-detail', {
            title: 'Inquiry Details - Found',
            user,
            inquiry,
            path: '/admin/inquiries'
        });
    } catch (error) {
        console.error('Admin get inquiry error:', error);
        req.flash('error', 'Error loading inquiry');
        res.redirect('/admin/inquiries');
    }
};

// Admin: Reply to inquiry
exports.adminReplyInquiry = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const { replyMessage } = req.body;
        const inquiry = await ProjectInquiry.findById(req.params.id);
        
        if (!inquiry) {
            req.flash('error', 'Inquiry not found');
            return res.redirect('/admin/inquiries');
        }
        
        inquiry.status = 'replied';
        inquiry.repliedAt = new Date();
        inquiry.replyMessage = replyMessage;
        inquiry.repliedBy = user._id;
        
        await inquiry.save();
        
        // Here you could send an email notification to the inquirer
        // sendReplyEmail(inquiry.email, inquiry.name, replyMessage, inquiry.projectName);
        
        req.flash('success', 'Reply sent successfully');
        res.redirect(`/admin/inquiries/${inquiry._id}`);
    } catch (error) {
        console.error('Admin reply inquiry error:', error);
        req.flash('error', 'Error sending reply');
        res.redirect(`/admin/inquiries/${req.params.id}`);
    }
};

// Admin: Delete inquiry
exports.adminDeleteInquiry = async (req, res) => {
    try {
        const inquiry = await ProjectInquiry.findById(req.params.id);
        
        if (!inquiry) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({ error: 'Inquiry not found' });
            }
            req.flash('error', 'Inquiry not found');
            return res.redirect('/admin/inquiries');
        }
        
        await ProjectInquiry.findByIdAndDelete(req.params.id);
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'Inquiry deleted successfully');
        res.redirect('/admin/inquiries');
    } catch (error) {
        console.error('Admin delete inquiry error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error deleting inquiry' });
        }
        req.flash('error', 'Error deleting inquiry');
        res.redirect('/admin/inquiries');
    }
};