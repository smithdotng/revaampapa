// controllers/adminController.js
const User = require('../models/User');
const Property = require('../models/Property');
const Transaction = require('../models/Transaction');
const FeaturedProperty = require('../models/FeaturedProperty');

// Add these methods to your controllers/adminController.js

// Get revenue data for charts
exports.getRevenueData = async (req, res) => {
    try {
        const { period } = req.query;
        const Transaction = require('../models/Transaction');
        
        let labels = [];
        let values = [];
        let startDate = new Date();
        let endDate = new Date();
        
        if (period === 'week') {
            // Last 7 days
            startDate.setDate(startDate.getDate() - 7);
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('en-NG', { weekday: 'short' }));
            }
        } else if (period === 'month') {
            // This month by week
            startDate.setDate(1);
            const weeks = Math.ceil((new Date().getDate()) / 7);
            for (let i = 1; i <= weeks; i++) {
                labels.push(`Week ${i}`);
            }
        } else if (period === 'year') {
            // Last 12 months
            startDate.setFullYear(startDate.getFullYear() - 1);
            for (let i = 11; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                labels.push(date.toLocaleDateString('en-NG', { month: 'short' }));
            }
        }
        
        // Get transactions in date range
        const transactions = await Transaction.find({
            paymentStatus: 'completed',
            transactionDate: { $gte: startDate, $lte: endDate }
        });
        
        // Group by period
        if (period === 'week') {
            // Daily
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dayStart = new Date(date.setHours(0,0,0,0));
                const dayEnd = new Date(date.setHours(23,59,59,999));
                
                const dayTransactions = transactions.filter(t => 
                    t.transactionDate >= dayStart && t.transactionDate <= dayEnd
                );
                const total = dayTransactions.reduce((sum, t) => 
                    sum + (t.commissionSplit?.platform?.amount || 0), 0);
                values.push(total);
            }
        } else if (period === 'month') {
            // Weekly
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            
            for (let i = 0; i < 4; i++) {
                const weekStart = new Date(firstDay);
                weekStart.setDate(weekStart.getDate() + (i * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                const weekTransactions = transactions.filter(t => 
                    t.transactionDate >= weekStart && t.transactionDate <= weekEnd
                );
                const total = weekTransactions.reduce((sum, t) => 
                    sum + (t.commissionSplit?.platform?.amount || 0), 0);
                values.push(total);
            }
        } else {
            // Monthly
            for (let i = 0; i < 12; i++) {
                const date = new Date();
                date.setMonth(date.getMonth() - (11 - i));
                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                
                const monthTransactions = transactions.filter(t => 
                    t.transactionDate >= monthStart && t.transactionDate <= monthEnd
                );
                const total = monthTransactions.reduce((sum, t) => 
                    sum + (t.commissionSplit?.platform?.amount || 0), 0);
                values.push(total);
            }
        }
        
        res.json({ labels, values });
    } catch (error) {
        console.error('Revenue data error:', error);
        res.json({ labels: [], values: [] });
    }
};

// Get property distribution for charts
exports.getPropertyDistribution = async (req, res) => {
    try {
        const Property = require('../models/Property');
        
        const distribution = await Property.aggregate([
            { $group: { _id: '$propertyType', count: { $sum: 1 } } }
        ]);
        
        const labels = distribution.map(d => d._id.replace('_', ' '));
        const values = distribution.map(d => d.count);
        
        res.json({ labels, values });
    } catch (error) {
        console.error('Property distribution error:', error);
        res.json({ labels: [], values: [] });
    }
};

// Get content distribution for charts (Properties vs Blogs)
exports.getContentDistribution = async (req, res) => {
    try {
        const Property = require('../models/Property');
        const Blog = require('../models/Blog');
        const User = require('../models/User');
        
        const totalProperties = await Property.countDocuments();
        const totalBlogs = await Blog.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalAgents = await User.countDocuments({ userType: 'agent' });
        
        res.json({
            labels: ['Properties', 'Blog Posts', 'Users', 'Agents'],
            values: [totalProperties, totalBlogs, totalUsers, totalAgents]
        });
    } catch (error) {
        console.error('Content distribution error:', error);
        res.json({ labels: [], values: [] });
    }
};

// Update the existing getDashboard method to include blog stats
exports.getDashboard = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        // Get statistics
        const totalUsers = await User.countDocuments();
        const totalRealtors = await User.countDocuments({ userType: 'realtor' });
        const totalAgents = await User.countDocuments({ userType: 'agent' });
        const pendingAgents = await User.countDocuments({ 
            userType: 'agent', 
            'agentProfile.isApproved': false,
            'agentProfile.registrationPaid': true
        });
        
        const totalProperties = await Property.countDocuments();
        const pendingProperties = await Property.countDocuments({ status: 'pending' });
        const featuredProperties = await Property.countDocuments({ featured: true });
        
        // Blog statistics
        const Blog = require('../models/Blog');
        const totalBlogs = await Blog.countDocuments();
        const publishedBlogs = await Blog.countDocuments({ status: 'published' });
        const draftBlogs = await Blog.countDocuments({ status: 'draft' });
        
        // Get total blog views
        const blogViewsResult = await Blog.aggregate([
            { $group: { _id: null, total: { $sum: '$views' } } }
        ]);
        const totalBlogViews = blogViewsResult.length > 0 ? blogViewsResult[0].total : 0;
        
        // Calculate total property value
        const propertyValueResult = await Property.aggregate([
            { $group: { _id: null, total: { $sum: '$price' } } }
        ]);
        const totalPropertyValue = propertyValueResult.length > 0 ? propertyValueResult[0].total : 0;
        
        const totalTransactions = await Transaction.countDocuments();
        const completedTransactions = await Transaction.countDocuments({ paymentStatus: 'completed' });
        
        const revenueResult = await Transaction.aggregate([
            { $match: { paymentStatus: 'completed' } },
            { $group: { _id: null, total: { $sum: '$commissionSplit.platform.amount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
        
        // Calculate monthly revenue
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const monthlyRevenueResult = await Transaction.aggregate([
            { 
                $match: { 
                    paymentStatus: 'completed',
                    transactionDate: { $gte: startOfMonth }
                } 
            },
            { $group: { _id: null, total: { $sum: '$commissionSplit.platform.amount' } } }
        ]);
        const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].total : 0;
        
        // Get pending withdrawals count
        const pendingWithdrawals = 0; // Placeholder until Withdrawal model is created
        
        // Get recent users
        const recentUsers = await User.find()
            .sort('-createdAt')
            .limit(5);
        
        // Get recent properties
        const recentProperties = await Property.find()
            .populate('owner', 'name')
            .sort('-createdAt')
            .limit(5);
        
        // Get recent transactions
        const recentTransactions = await Transaction.find()
            .populate('property', 'title')
            .populate('agent', 'name')
            .sort('-transactionDate')
            .limit(5);
        
        // Get recent blog posts
        const recentBlogs = await Blog.find()
            .sort('-createdAt')
            .limit(5);
        
        res.render('admin/dashboard', {
            title: 'Admin Dashboard - Found Properties',
            user: user,
            stats: {
                totalUsers,
                totalRealtors,
                totalAgents,
                pendingAgents,
                totalProperties,
                pendingProperties,
                featuredProperties,
                totalPropertyValue,
                totalTransactions,
                completedTransactions,
                totalRevenue,
                monthlyRevenue,
                pendingWithdrawals,
                // Blog stats
                totalBlogs,
                publishedBlogs,
                draftBlogs,
                totalBlogViews
            },
            recentUsers,
            recentProperties,
            recentTransactions,
            recentBlogs,
            path: '/admin/dashboard'
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
};

// User management
exports.getUsers = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const { type, search, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (type && type !== 'all') {
            query.userType = type;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        
        const users = await User.find(query)
            .select('-password')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await User.countDocuments(query);
        
        res.render('admin/users', {
            title: 'User Management - Found Properties',
            user: user,
            users,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            filters: req.query,
            path: '/admin/users'
        });
    } catch (error) {
        console.error('Get users error:', error);
        req.flash('error', 'Error loading users');
        res.redirect('/admin/dashboard');
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        // Get the logged-in admin user
        const admin = await User.findById(req.session.userId);
        
        if (!admin) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin/users');
        }
        
        // Get user's properties if realtor
        let properties = [];
        if (user.userType === 'realtor') {
            properties = await Property.find({ owner: user._id });
        }
        
        // Get user's transactions if agent
        let transactions = [];
        if (user.userType === 'agent') {
            transactions = await Transaction.find({ agent: user._id })
                .populate('property', 'title');
        }
        
        res.render('admin/user-detail', {
            title: `User: ${user.name} - Found Properties`,
            user: admin,
            profileUser: user,
            properties,
            transactions,
            path: '/admin/users'
        });
    } catch (error) {
        console.error('Get user details error:', error);
        req.flash('error', 'Error loading user details');
        res.redirect('/admin/users');
    }
};

exports.verifyUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({ error: 'User not found' });
            }
            req.flash('error', 'User not found');
            return res.redirect('/admin/users');
        }
        
        if (user.userType === 'realtor') {
            user.realtorProfile.verified = true;
            await user.save();
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({ success: true });
            }
            
            req.flash('success', 'Realtor verified successfully');
        } else {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(400).json({ error: 'Can only verify realtors' });
            }
            req.flash('error', 'Can only verify realtors');
        }
        
        res.redirect(`/admin/users/${user._id}`);
    } catch (error) {
        console.error('Verify user error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error verifying user' });
        }
        req.flash('error', 'Error verifying user');
        res.redirect('/admin/users');
    }
};

exports.suspendUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({ error: 'User not found' });
            }
            req.flash('error', 'User not found');
            return res.redirect('/admin/users');
        }
        
        // Add suspended field if it doesn't exist in schema
        user.isSuspended = !user.isSuspended;
        await user.save();
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true, suspended: user.isSuspended });
        }
        
        req.flash('success', `User ${user.isSuspended ? 'suspended' : 'unsuspended'} successfully`);
        res.redirect(`/admin/users/${user._id}`);
    } catch (error) {
        console.error('Suspend user error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error suspending user' });
        }
        req.flash('error', 'Error suspending user');
        res.redirect('/admin/users');
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({ error: 'User not found' });
            }
            req.flash('error', 'User not found');
            return res.redirect('/admin/users');
        }
        
        // Don't allow deleting yourself
        if (user._id.toString() === req.session.userId) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }
            req.flash('error', 'Cannot delete your own account');
            return res.redirect('/admin/users');
        }
        
        await User.findByIdAndDelete(req.params.id);
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'User deleted successfully');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Delete user error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error deleting user' });
        }
        req.flash('error', 'Error deleting user');
        res.redirect('/admin/users');
    }
};

// Agent management
exports.getAgents = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const { search, status, sort, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = { userType: 'agent' };
        
        if (status === 'approved') {
            query['agentProfile.isApproved'] = true;
        } else if (status === 'pending') {
            query['agentProfile.isApproved'] = false;
            query['agentProfile.registrationPaid'] = true;
        } else if (status === 'rejected') {
            query['agentProfile.rejected'] = true;
        }
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        
        let sortOption = { createdAt: -1 };
        if (sort === 'name') {
            sortOption = { name: 1 };
        } else if (sort === 'earnings') {
            sortOption = { 'agentProfile.totalEarnings': -1 };
        }
        
        const agents = await User.find(query)
            .select('-password')
            .sort(sortOption)
            .skip(skip)
            .limit(limit);
        
        const total = await User.countDocuments(query);
        
        res.render('admin/agents', {
            title: 'Agent Management - Found Properties',
            user: user,
            agents,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            filters: req.query,
            path: '/admin/agents'
        });
    } catch (error) {
        console.error('Get agents error:', error);
        req.flash('error', 'Error loading agents');
        res.redirect('/admin/dashboard');
    }
};

exports.getPendingAgents = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const agents = await User.find({ 
            userType: 'agent',
            'agentProfile.isApproved': false,
            'agentProfile.registrationPaid': true,
            'agentProfile.rejected': { $ne: true }
        }).select('-password').sort('-createdAt');
        
        res.render('admin/pending-agents', {
            title: 'Pending Agent Approvals - Found Properties',
            user: user,
            agents,
            path: '/admin/agents/pending'
        });
    } catch (error) {
        console.error('Get pending agents error:', error);
        req.flash('error', 'Error loading pending agents');
        res.redirect('/admin/dashboard');
    }
};

exports.getAgentDetails = async (req, res) => {
    try {
        const agent = await User.findById(req.params.id)
            .select('-password');
        
        if (!agent || agent.userType !== 'agent') {
            return res.status(404).json({ error: 'Agent not found' });
        }
        
        res.json(agent);
    } catch (error) {
        console.error('Get agent details error:', error);
        res.status(500).json({ error: 'Error loading agent details' });
    }
};

exports.approveAgent = async (req, res) => {
    try {
        const agent = await User.findById(req.params.id);
        
        if (!agent) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({ error: 'Agent not found' });
            }
            req.flash('error', 'Agent not found');
            return res.redirect('/admin/agents/pending');
        }
        
        agent.agentProfile.isApproved = true;
        agent.agentProfile.approvalDate = new Date();
        agent.agentProfile.rejected = false;
        await agent.save();
        
        // Here you would send an approval email to the agent
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'Agent approved successfully');
        res.redirect('/admin/agents/pending');
    } catch (error) {
        console.error('Approve agent error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error approving agent' });
        }
        req.flash('error', 'Error approving agent');
        res.redirect('/admin/agents/pending');
    }
};

exports.rejectAgent = async (req, res) => {
    try {
        const { reason } = req.body;
        const agent = await User.findById(req.params.id);
        
        if (!agent) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({ error: 'Agent not found' });
            }
            req.flash('error', 'Agent not found');
            return res.redirect('/admin/agents/pending');
        }
        
        // Mark as rejected instead of deleting
        agent.agentProfile.rejected = true;
        agent.agentProfile.rejectionDate = new Date();
        agent.agentProfile.rejectionReason = reason || 'Not specified';
        agent.agentProfile.isApproved = false;
        await agent.save();
        
        // Here you would send a rejection email to the agent
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'Agent application rejected');
        res.redirect('/admin/agents/pending');
    } catch (error) {
        console.error('Reject agent error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error rejecting agent' });
        }
        req.flash('error', 'Error rejecting agent');
        res.redirect('/admin/agents/pending');
    }
};

exports.suspendAgent = async (req, res) => {
    try {
        const agent = await User.findById(req.params.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        
        agent.agentProfile.isActive = !agent.agentProfile.isActive;
        agent.agentProfile.suspendedAt = agent.agentProfile.isActive ? null : new Date();
        await agent.save();
        
        res.json({ success: true, suspended: !agent.agentProfile.isActive });
    } catch (error) {
        console.error('Suspend agent error:', error);
        res.status(500).json({ error: 'Error suspending agent' });
    }
};

exports.getAgentTransactions = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const transactions = await Transaction.find({ agent: req.params.id })
            .populate('property', 'title')
            .sort('-transactionDate');
        
        const agent = await User.findById(req.params.id);
        
        res.render('admin/agent-transactions', {
            title: `Agent Transactions: ${agent ? agent.name : ''} - Found Properties`,
            user: user,
            transactions,
            agent,
            path: '/admin/agents'
        });
    } catch (error) {
        console.error('Get agent transactions error:', error);
        req.flash('error', 'Error loading agent transactions');
        res.redirect('/admin/agents');
    }
};

exports.deleteAgent = async (req, res) => {
    try {
        const agent = await User.findById(req.params.id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        
        await User.findByIdAndDelete(req.params.id);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete agent error:', error);
        res.status(500).json({ error: 'Error deleting agent' });
    }
};

// Property management
exports.getProperties = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const { status, type, tier, search, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        if (type && type !== 'all') {
            query.propertyType = type;
        }
        if (tier && tier !== 'all') {
            query.listingTier = tier;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'location.address': { $regex: search, $options: 'i' } },
                { 'location.city': { $regex: search, $options: 'i' } },
                { 'location.state': { $regex: search, $options: 'i' } }
            ];
        }
        
        const properties = await Property.find(query)
            .populate('owner', 'name email')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await Property.countDocuments(query);
        
        // Get counts for stats
        const totalProperties = await Property.countDocuments();
        const availableProperties = await Property.countDocuments({ status: 'available' });
        const pendingProperties = await Property.countDocuments({ status: 'pending' });
        const soldProperties = await Property.countDocuments({ status: { $in: ['sold', 'rented'] } });
        
        // Get property types for filter
        const propertyTypes = await Property.aggregate([
            { $group: { _id: '$propertyType', count: { $sum: 1 } } }
        ]);
        
        // Get tier distribution
        const tierDistribution = await Property.aggregate([
            { $group: { _id: '$listingTier', count: { $sum: 1 } } }
        ]);
        
        res.render('admin/properties', {
            title: 'Property Management - Found Properties',
            user: user,
            properties,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            filters: req.query,
            stats: {
                total: totalProperties,
                available: availableProperties,
                pending: pendingProperties,
                sold: soldProperties
            },
            propertyTypes,
            tierDistribution,
            path: '/admin/properties'
        });
    } catch (error) {
        console.error('Get properties error:', error);
        req.flash('error', 'Error loading properties');
        res.redirect('/admin/dashboard');
    }
};

exports.getPendingProperties = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const properties = await Property.find({ status: 'pending' })
            .populate('owner', 'name email')
            .sort('-createdAt');
        
        res.render('admin/pending-properties', {
            title: 'Pending Property Approvals - Found Properties',
            user: user,
            properties,
            path: '/admin/properties/pending'
        });
    } catch (error) {
        console.error('Get pending properties error:', error);
        req.flash('error', 'Error loading pending properties');
        res.redirect('/admin/dashboard');
    }
};

exports.getPropertyDetails = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const property = await Property.findById(req.params.id)
            .populate('owner', 'name email phone realtorProfile');
        
        if (!property) {
            req.flash('error', 'Property not found');
            return res.redirect('/admin/properties');
        }
        
        res.render('admin/property-detail', {
            title: `Property: ${property.title} - Found Properties`,
            user: user,
            property,
            path: '/admin/properties'
        });
    } catch (error) {
        console.error('Get property details error:', error);
        req.flash('error', 'Error loading property details');
        res.redirect('/admin/properties');
    }
};

exports.approveProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({ error: 'Property not found' });
            }
            req.flash('error', 'Property not found');
            return res.redirect('/admin/properties/pending');
        }
        
        property.status = 'available';
        await property.save();
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'Property approved successfully');
        res.redirect('/admin/properties/pending');
    } catch (error) {
        console.error('Approve property error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error approving property' });
        }
        req.flash('error', 'Error approving property');
        res.redirect('/admin/properties/pending');
    }
};

exports.rejectProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({ error: 'Property not found' });
            }
            req.flash('error', 'Property not found');
            return res.redirect('/admin/properties/pending');
        }
        
        property.status = 'rejected';
        await property.save();
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'Property rejected');
        res.redirect('/admin/properties/pending');
    } catch (error) {
        console.error('Reject property error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error rejecting property' });
        }
        req.flash('error', 'Error rejecting property');
        res.redirect('/admin/properties/pending');
    }
};

exports.featureProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({ error: 'Property not found' });
            }
            req.flash('error', 'Property not found');
            return res.redirect('/admin/properties');
        }
        
        property.featured = !property.featured;
        if (property.featured) {
            property.featuredExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        }
        await property.save();
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true, featured: property.featured });
        }
        
        req.flash('success', `Property ${property.featured ? 'featured' : 'unfeatured'} successfully`);
        res.redirect(`/admin/properties/${property._id}`);
    } catch (error) {
        console.error('Feature property error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error featuring property' });
        }
        req.flash('error', 'Error featuring property');
        res.redirect('/admin/properties');
    }
};

exports.deleteProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        
        if (!property) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({ error: 'Property not found' });
            }
            req.flash('error', 'Property not found');
            return res.redirect('/admin/properties');
        }
        
        await Property.findByIdAndDelete(req.params.id);
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'Property deleted successfully');
        res.redirect('/admin/properties');
    } catch (error) {
        console.error('Delete property error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error deleting property' });
        }
        req.flash('error', 'Error deleting property');
        res.redirect('/admin/properties');
    }
};

// Featured properties
exports.getFeaturedProperties = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const featuredProperties = await FeaturedProperty.find()
            .populate('property')
            .sort('-createdAt');
        
        res.render('admin/featured-properties', {
            title: 'Featured Properties - Found Properties',
            user: user,
            featuredProperties,
            path: '/admin/featured'
        });
    } catch (error) {
        console.error('Get featured properties error:', error);
        req.flash('error', 'Error loading featured properties');
        res.redirect('/admin/dashboard');
    }
};

exports.getAddFeaturedProperty = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const properties = await Property.find({ status: 'available' })
            .select('title location price');
        
        res.render('admin/add-featured', {
            title: 'Add Featured Property - Found Properties',
            user: user,
            properties,
            path: '/admin/featured'
        });
    } catch (error) {
        console.error('Get add featured property error:', error);
        req.flash('error', 'Error loading form');
        res.redirect('/admin/featured');
    }
};

exports.addFeaturedProperty = async (req, res) => {
    try {
        const { propertyId, title, description, badgeText, badgeColor, arrangementType, partnerName, partnerContact, startDate, endDate, displayOrder } = req.body;
        
        const featuredProperty = new FeaturedProperty({
            property: propertyId,
            title,
            description,
            badge: {
                text: badgeText,
                color: badgeColor
            },
            arrangementType,
            partnerDetails: {
                name: partnerName,
                contact: partnerContact
            },
            startDate: startDate || new Date(),
            endDate: endDate || null,
            displayOrder: displayOrder || 0,
            isActive: true
        });
        
        await featuredProperty.save();
        
        req.flash('success', 'Featured property added successfully');
        res.redirect('/admin/featured');
    } catch (error) {
        console.error('Add featured property error:', error);
        req.flash('error', 'Error adding featured property');
        res.redirect('/admin/featured/add');
    }
};

exports.getEditFeaturedProperty = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const featuredProperty = await FeaturedProperty.findById(req.params.id)
            .populate('property');
        
        if (!featuredProperty) {
            req.flash('error', 'Featured property not found');
            return res.redirect('/admin/featured');
        }
        
        const properties = await Property.find({ status: 'available' })
            .select('title location price');
        
        res.render('admin/edit-featured', {
            title: 'Edit Featured Property - Found Properties',
            user: user,
            featuredProperty,
            properties,
            path: '/admin/featured'
        });
    } catch (error) {
        console.error('Get edit featured property error:', error);
        req.flash('error', 'Error loading form');
        res.redirect('/admin/featured');
    }
};

exports.editFeaturedProperty = async (req, res) => {
    try {
        const { propertyId, title, description, badgeText, badgeColor, arrangementType, partnerName, partnerContact, startDate, endDate, displayOrder, isActive } = req.body;
        
        await FeaturedProperty.findByIdAndUpdate(req.params.id, {
            property: propertyId,
            title,
            description,
            badge: { text: badgeText, color: badgeColor },
            arrangementType,
            partnerDetails: { name: partnerName, contact: partnerContact },
            startDate: startDate,
            endDate: endDate,
            displayOrder: displayOrder,
            isActive: isActive === 'on'
        });
        
        req.flash('success', 'Featured property updated successfully');
        res.redirect('/admin/featured');
    } catch (error) {
        console.error('Edit featured property error:', error);
        req.flash('error', 'Error updating featured property');
        res.redirect(`/admin/featured/${req.params.id}/edit`);
    }
};

exports.deleteFeaturedProperty = async (req, res) => {
    try {
        await FeaturedProperty.findByIdAndDelete(req.params.id);
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'Featured property deleted successfully');
        res.redirect('/admin/featured');
    } catch (error) {
        console.error('Delete featured property error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error deleting featured property' });
        }
        req.flash('error', 'Error deleting featured property');
        res.redirect('/admin/featured');
    }
};

// Transactions
exports.getTransactions = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const { status, agentId, propertyId, startDate, endDate, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (status && status !== 'all') {
            query.paymentStatus = status;
        }
        if (agentId) {
            query.agent = agentId;
        }
        if (propertyId) {
            query.property = propertyId;
        }
        if (startDate || endDate) {
            query.transactionDate = {};
            if (startDate) query.transactionDate.$gte = new Date(startDate);
            if (endDate) query.transactionDate.$lte = new Date(endDate);
        }
        
        const transactions = await Transaction.find(query)
            .populate('property', 'title')
            .populate('agent', 'name')
            .sort('-transactionDate')
            .skip(skip)
            .limit(limit);
        
        const total = await Transaction.countDocuments(query);
        
        // Get total revenue
        const revenueResult = await Transaction.aggregate([
            { $match: { paymentStatus: 'completed' } },
            { $group: { _id: null, total: { $sum: '$commissionSplit.platform.amount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
        
        // Get agents for filter
        const agents = await User.find({ userType: 'agent' }).select('name');
        
        res.render('admin/transactions', {
            title: 'Transaction Management - Found Properties',
            user: user,
            transactions,
            agents,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            totalRevenue,
            filters: req.query,
            path: '/admin/transactions'
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        req.flash('error', 'Error loading transactions');
        res.redirect('/admin/dashboard');
    }
};

exports.getTransactionDetails = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const transaction = await Transaction.findById(req.params.id)
            .populate('property')
            .populate('agent', 'name email phone');
        
        if (!transaction) {
            req.flash('error', 'Transaction not found');
            return res.redirect('/admin/transactions');
        }
        
        res.render('admin/transaction-detail', {
            title: 'Transaction Details - Found Properties',
            user: user,
            transaction,
            path: '/admin/transactions'
        });
    } catch (error) {
        console.error('Get transaction details error:', error);
        req.flash('error', 'Error loading transaction details');
        res.redirect('/admin/transactions');
    }
};

// Withdrawals (placeholder - would need Withdrawal model)
exports.getWithdrawals = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        // This would require a Withdrawal model
        res.render('admin/withdrawals', {
            title: 'Withdrawal Requests - Found Properties',
            user: user,
            withdrawals: [],
            path: '/admin/withdrawals'
        });
    } catch (error) {
        console.error('Get withdrawals error:', error);
        req.flash('error', 'Error loading withdrawals');
        res.redirect('/admin/dashboard');
    }
};

// Settings
exports.getSettings = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        res.render('admin/settings', {
            title: 'Platform Settings - Found Properties',
            user: user,
            settings: {
                agentRegistrationFee: process.env.AGENT_REGISTRATION_FEE || 5000,
                agentCommission: 70,
                promoterCommission: 10,
                platformCommission: 20,
                siteName: 'Found Properties',
                siteEmail: 'info@foundproperties.ng',
                sitePhone: '+234 800 000 0000',
                siteAddress: 'Suite 5 Gwandal Centre, 1015 Frai Close, Wuse 2, Abuja'
            },
            path: '/admin/settings'
        });
    } catch (error) {
        console.error('Get settings error:', error);
        req.flash('error', 'Error loading settings');
        res.redirect('/admin/dashboard');
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { agentRegistrationFee, agentCommission, promoterCommission, platformCommission, siteName, siteEmail, sitePhone, siteAddress } = req.body;
        
        // In a real app, save to database
        // For now, just update env (temporary)
        process.env.AGENT_REGISTRATION_FEE = agentRegistrationFee;
        
        req.flash('success', 'Settings updated successfully');
        res.redirect('/admin/settings');
    } catch (error) {
        console.error('Update settings error:', error);
        req.flash('error', 'Error updating settings');
        res.redirect('/admin/settings');
    }
};

// Analytics
exports.getAnalytics = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const { period = 'month' } = req.query;
        
        // Get date range
        const endDate = new Date();
        let startDate = new Date();
        
        if (period === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        } else if (period === 'year') {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }
        
        // Get daily property listings
        const propertyListings = await Property.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);
        
        // Get daily transactions
        const dailyTransactions = await Transaction.aggregate([
            {
                $match: {
                    transactionDate: { $gte: startDate, $lte: endDate },
                    paymentStatus: 'completed'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } },
                    count: { $sum: 1 },
                    revenue: { $sum: '$commissionSplit.platform.amount' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);
        
        // Get property type distribution
        const propertyTypes = await Property.aggregate([
            {
                $group: {
                    _id: '$propertyType',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Get user registration trend
        const userRegistrations = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);
        
        // Get top agents
        const topAgents = await Transaction.aggregate([
            {
                $match: { paymentStatus: 'completed' }
            },
            {
                $group: {
                    _id: '$agent',
                    transactions: { $sum: 1 },
                    earnings: { $sum: '$commissionSplit.agent.amount' }
                }
            },
            { $sort: { earnings: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'agentInfo'
                }
            }
        ]);
        
        res.render('admin/analytics', {
            title: 'Analytics - Found Properties',
            user: user,
            propertyListings,
            dailyTransactions,
            userRegistrations,
            propertyTypes,
            topAgents,
            period,
            path: '/admin/analytics'
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        req.flash('error', 'Error loading analytics');
        res.redirect('/admin/dashboard');
    }
};

// Add these methods to your adminController.js

// Get admin profile page
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        res.render('admin/profile', {
            title: 'Admin Profile - Found',
            user: user,
            path: '/admin/profile'
        });
    } catch (error) {
        console.error('Get profile error:', error);
        req.flash('error', 'Error loading profile');
        res.redirect('/admin/dashboard');
    }
};

// Update admin profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, bio } = req.body;
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        user.name = name;
        user.phone = phone;
        user.bio = bio;
        
        await user.save();
        
        req.flash('success', 'Profile updated successfully');
        res.redirect('/admin/profile');
    } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/admin/profile');
    }
};

// Update admin profile image
exports.updateProfileImage = async (req, res) => {
    try {
        const multer = require('multer');
        const path = require('path');
        const fs = require('fs');
        
        // Configure multer for profile images
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const dir = path.join(__dirname, '../public/uploads/profiles');
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                cb(null, dir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
            }
        });
        
        const upload = multer({ 
            storage: storage,
            limits: { fileSize: 2 * 1024 * 1024 },
            fileFilter: (req, file, cb) => {
                const allowedTypes = /jpeg|jpg|png|gif|webp/;
                const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
                const mimetype = allowedTypes.test(file.mimetype);
                if (mimetype && extname) {
                    return cb(null, true);
                } else {
                    cb(new Error('Only image files are allowed'));
                }
            }
        }).single('profileImage');
        
        upload(req, res, async (err) => {
            if (err) {
                if (req.xhr) {
                    return res.status(400).json({ error: err.message });
                }
                req.flash('error', err.message);
                return res.redirect('/admin/profile');
            }
            
            if (!req.file) {
                if (req.xhr) {
                    return res.status(400).json({ error: 'No file uploaded' });
                }
                req.flash('error', 'No file uploaded');
                return res.redirect('/admin/profile');
            }
            
            const user = await User.findById(req.session.userId);
            
            if (!user) {
                if (req.xhr) {
                    return res.status(404).json({ error: 'User not found' });
                }
                req.flash('error', 'User not found');
                return res.redirect('/admin/profile');
            }
            
            // Delete old profile image if exists and not default
            if (user.profileImage && user.profileImage !== 'default-avatar.jpg') {
                const oldImagePath = path.join(__dirname, '../public/uploads/profiles', user.profileImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            
            user.profileImage = req.file.filename;
            await user.save();
            
            if (req.xhr) {
                return res.json({ success: true, image: '/uploads/profiles/' + req.file.filename });
            }
            
            req.flash('success', 'Profile picture updated successfully');
            res.redirect('/admin/profile');
        });
    } catch (error) {
        console.error('Update profile image error:', error);
        if (req.xhr) {
            return res.status(500).json({ error: 'Error updating profile picture' });
        }
        req.flash('error', 'Error updating profile picture');
        res.redirect('/admin/profile');
    }
};

// Remove admin profile image
exports.removeProfileImage = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.profileImage && user.profileImage !== 'default-avatar.jpg') {
            const imagePath = path.join(__dirname, '../public/uploads/profiles', user.profileImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        user.profileImage = 'default-avatar.jpg';
        await user.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Remove profile image error:', error);
        res.status(500).json({ error: 'Error removing profile picture' });
    }
};

// Change admin password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin/profile');
        }
        
        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/admin/profile');
        }
        
        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/admin/profile');
        }
        
        // Check password length
        if (newPassword.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect('/admin/profile');
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        req.flash('success', 'Password changed successfully');
        res.redirect('/admin/profile');
    } catch (error) {
        console.error('Change password error:', error);
        req.flash('error', 'Error changing password');
        res.redirect('/admin/profile');
    }
};