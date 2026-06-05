// routes/blogRoutes.js
const express = require('express');
const router = express.Router();

// Public blog routes
router.get('/', (req, res) => {
    res.render('blog/index', {
        title: 'Blog - RevaampAPA',
        currentPath: '/blog'
    });
});

router.get('/:slug', (req, res) => {
    res.render('blog/detail', {
        title: 'Blog Post - RevaampAPA',
        currentPath: `/blog/${req.params.slug}`
    });
});

module.exports = router;