// src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/stats', requireAuth, requireRole(['admin', 'company']), getDashboardStats);

module.exports = router;