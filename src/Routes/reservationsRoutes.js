// src/routes/reservationsRoutes.js
const express = require('express');
const router = express.Router();
const {
  createReservation,
  getReservations,
  getUserReservations,
  updateReservation,
  deleteReservation,
  getReservationStats
} = require('../controllers/reservationsController');
const { requireAuth, requireRole, requireOwnership } = require('../middleware/auth');

// إنشاء حجز جديد (جميع المستخدمين المسجلين)
router.post('/', requireAuth, createReservation);

// الحصول على الحجوزات (المدراء والشركات فقط)
router.get('/', requireAuth, requireRole(['admin', 'company']), getReservations);

// الحصول على حجوزات المستخدم الحالي
router.get('/user', requireAuth, getUserReservations);

// تحديث حجز (المالك أو المدير أو الشركة)
router.put('/:id', requireAuth, requireOwnership, updateReservation);

// حذف حجز (المالك أو المدير أو الشركة)
router.delete('/:id', requireAuth, requireOwnership, deleteReservation);

// إحصائيات الحجوزات (المدراء والشركات)
router.get('/stats', requireAuth, requireRole(['admin', 'company']), getReservationStats);

module.exports = router;