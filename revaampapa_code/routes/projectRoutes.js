// routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// Make sure these controller methods exist or create simple ones
router.get('/', (req, res) => {
    res.render('projects/index', {
        title: 'Our Projects - RevaampAPA',
        projects: [],
        currentPath: '/projects'
    });
});

router.get('/:slug', (req, res) => {
    res.render('projects/detail', {
        title: 'Project Details - RevaampAPA',
        currentPath: `/projects/${req.params.slug}`
    });
});

module.exports = router;