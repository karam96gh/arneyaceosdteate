// src/routes/authRoutes.js
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
const { requireAuth, requireRole } = require('../middleware/auth');

// مسارات عامة (بدون مصادقة)
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