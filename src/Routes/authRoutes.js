// src/routes/authRoutes.js - UPDATED WITH TEST ENDPOINT
const express = require('express');
const router = express.Router();
const {
  login,
  register,
  getMe,
  getUsers,
  updateUser,
  changePassword,
  resetPassword
} = require('../controllers/authController');
const { requireAuth, requireRole, testAuth } = require('../middleware/auth');

// ✅ مسار اختبار التوكن (للتطوير والتشخيص)
router.get('/test-token', testAuth);

// مسارات عامة (لا تحتاج مصادقة)
router.post('/login', login);
router.post('/register', register);

// مسارات تتطلب مصادقة
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);

// مسارات المدراء فقط
router.get('/users', requireAuth, requireRole(['admin']), getUsers);
router.put('/users/:id', requireAuth, requireRole(['admin']), updateUser);
router.post('/reset-password', requireAuth, requireRole(['admin']), resetPassword);

module.exports = router;