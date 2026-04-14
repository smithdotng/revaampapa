// controllers/blogController.js
const Blog = require('../models/Blog');
const User = require('../models/User');
const slugify = require('slugify');

// Public: Get all published blogs
exports.getAllBlogs = async (req, res) => {
    try {
        const { category, tag, search, page = 1, limit = 9 } = req.query;
        const skip = (page - 1) * limit;
        
        let query = { status: 'published' };
        
        if (category) {
            query.categories = category;
        }
        
        if (tag) {
            query.tags = tag;
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        
        const blogs = await Blog.find(query)
            .populate('author', 'name profileImage')
            .sort('-publishedAt')
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await Blog.countDocuments(query);
        
        // Get featured blogs
        const featuredBlogs = await Blog.find({ 
            status: 'published', 
            featured: true 
        })
        .populate('author', 'name')
        .sort('-publishedAt')
        .limit(3);
        
        // Get categories with counts
        const categories = await Blog.aggregate([
            { $match: { status: 'published' } },
            { $unwind: '$categories' },
            { $group: { 
                _id: '$categories', 
                count: { $sum: 1 } 
            }},
            { $sort: { count: -1 } }
        ]);
        
        // Get popular tags
        const tags = await Blog.aggregate([
            { $match: { status: 'published' } },
            { $unwind: '$tags' },
            { $group: { 
                _id: '$tags', 
                count: { $sum: 1 } 
            }},
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]);
        
        res.render('blog/index', {
            title: 'Found Properties Blog - Real Estate Insights Nigeria',
            blogs,
            featuredBlogs,
            categories,
            tags,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total,
            filters: req.query,
            path: '/blog'
        });
    } catch (error) {
        console.error('Get all blogs error:', error);
        req.flash('error', 'Error loading blog posts');
        res.redirect('/');
    }
};

// Public: Get single blog by slug
exports.getBlogBySlug = async (req, res) => {
    try {
        const blog = await Blog.findOne({ 
            slug: req.params.slug,
            status: 'published'
        }).populate('author', 'name profileImage bio');
        
        if (!blog) {
            return res.status(404).render('404', { 
                message: 'Blog post not found' 
            });
        }
        
        // Increment views
        blog.views += 1;
        await blog.save();
        
        // Get related blogs (same category)
        const relatedBlogs = await Blog.find({
            _id: { $ne: blog._id },
            status: 'published',
            categories: { $in: blog.categories }
        })
        .populate('author', 'name')
        .limit(3)
        .sort('-publishedAt');
        
        // Set OG image for social sharing
        const ogImage = blog.ogImage || blog.featuredImage;
        
        res.render('blog/detail', {
            title: blog.title + ' - Found Properties Blog',
            blog,
            relatedBlogs,
            ogImage,
            path: '/blog'
        });
    } catch (error) {
        console.error('Get blog by slug error:', error);
        req.flash('error', 'Error loading blog post');
        res.redirect('/blog');
    }
};

// Admin: Get all blogs (including drafts)
exports.adminGetAllBlogs = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const { status, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const blogs = await Blog.find(query)
            .populate('author', 'name email')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        
        const total = await Blog.countDocuments(query);
        
        res.render('admin/blogs', {
            title: 'Blog Management - Found Properties',
            user: user,
            blogs,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total,
            filters: req.query,
            path: '/admin/blogs'
        });
    } catch (error) {
        console.error('Admin get all blogs error:', error);
        req.flash('error', 'Error loading blogs');
        res.redirect('/admin/dashboard');
    }
};

// Admin: Get create blog form
exports.getCreateBlog = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        res.render('admin/blog-form', {
            title: 'Create New Blog Post - Found Properties',
            user: user,
            blog: null,
            path: '/admin/blogs'
        });
    } catch (error) {
        console.error('Get create blog error:', error);
        req.flash('error', 'Error loading form');
        res.redirect('/admin/blogs');
    }
};

// Admin: Create blog post
exports.createBlog = async (req, res) => {
    try {
        // Get the logged-in admin user from session
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const {
            title, excerpt, content, categories, tags,
            metaTitle, metaDescription, metaKeywords,
            status, featured
        } = req.body;
        
        // Process categories and tags
        const categoryArray = categories ? 
            (Array.isArray(categories) ? categories : [categories]) : [];
        
        const tagArray = tags ? 
            tags.split(',').map(tag => tag.trim()) : [];
        
        // Handle featured image upload
        if (!req.file) {
            req.flash('error', 'Featured image is required');
            return res.redirect('/admin/blogs/create');
        }
        
        const featuredImage = '/uploads/blogs/' + req.file.filename;
        
        // Generate slug from title
        const slug = title
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);
        
        const blog = new Blog({
            title,
            slug,
            excerpt,
            content,
            featuredImage,
            ogImage: featuredImage, // Set OG image same as featured
            author: user._id,
            authorName: user.name,
            categories: categoryArray,
            tags: tagArray,
            metaTitle: metaTitle || title,
            metaDescription: metaDescription || excerpt,
            metaKeywords,
            status,
            featured: featured === 'on',
            publishedAt: status === 'published' ? new Date() : null
        });
        
        await blog.save();
        
        req.flash('success', 'Blog post created successfully');
        res.redirect('/admin/blogs');
    } catch (error) {
        console.error('Create blog error:', error);
        req.flash('error', 'Error creating blog post: ' + error.message);
        res.redirect('/admin/blogs/create');
    }
};

// Admin: Get edit blog form
exports.getEditBlog = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            req.flash('error', 'Blog post not found');
            return res.redirect('/admin/blogs');
        }
        
        res.render('admin/blog-form', {
            title: 'Edit Blog Post - Found Properties',
            user: user,
            blog,
            path: '/admin/blogs'
        });
    } catch (error) {
        console.error('Get edit blog error:', error);
        req.flash('error', 'Error loading blog post');
        res.redirect('/admin/blogs');
    }
};

// Admin: Update blog post
exports.updateBlog = async (req, res) => {
    try {
        // Get the logged-in admin user
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }
        
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            req.flash('error', 'Blog post not found');
            return res.redirect('/admin/blogs');
        }
        
        const {
            title, excerpt, content, categories, tags,
            metaTitle, metaDescription, metaKeywords,
            status, featured
        } = req.body;
        
        // Update fields
        blog.title = title;
        blog.excerpt = excerpt;
        blog.content = content;
        blog.categories = categories ? 
            (Array.isArray(categories) ? categories : [categories]) : [];
        blog.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
        blog.metaTitle = metaTitle || title;
        blog.metaDescription = metaDescription || excerpt;
        blog.metaKeywords = metaKeywords;
        blog.featured = featured === 'on';
        
        // Handle status change
        if (status === 'published' && blog.status !== 'published') {
            blog.publishedAt = new Date();
        }
        blog.status = status;
        
        // Handle new featured image
        if (req.file) {
            blog.featuredImage = '/uploads/blogs/' + req.file.filename;
            blog.ogImage = '/uploads/blogs/' + req.file.filename;
        }
        
        // Update slug if title changed
        if (title !== blog.title) {
            blog.slug = title
                .toLowerCase()
                .replace(/[^\w\s]/g, '')
                .replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);
        }
        
        await blog.save();
        
        req.flash('success', 'Blog post updated successfully');
        res.redirect('/admin/blogs');
    } catch (error) {
        console.error('Update blog error:', error);
        req.flash('error', 'Error updating blog post: ' + error.message);
        res.redirect(`/admin/blogs/${req.params.id}/edit`);
    }
};

// Admin: Delete blog post
exports.deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({ error: 'Blog post not found' });
            }
            req.flash('error', 'Blog post not found');
            return res.redirect('/admin/blogs');
        }
        
        await Blog.findByIdAndDelete(req.params.id);
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'Blog post deleted successfully');
        res.redirect('/admin/blogs');
    } catch (error) {
        console.error('Delete blog error:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error deleting blog post' });
        }
        req.flash('error', 'Error deleting blog post');
        res.redirect('/admin/blogs');
    }
};