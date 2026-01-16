// src/routes/offersRoutes.js
const express = require('express');
const router = express.Router();
const {
  createOffer,
  getOffers,
  getUserOffers,
  updateOffer,
  deleteOffer,
  getOfferStats,
  getUpcomingOffers
} = require('../controllers/offersController');
const { requireAuth, requireRole, requireOwnership } = require('../middleware/auth');
const { uploadMiddlewares } = require('../config/upload');

// ✅ إنشاء عرض جديد (جميع المستخدمين المسجلين) مع رفع صورة الهوية
router.post('/',
  requireAuth,
  uploadMiddlewares.general.single('idImage'),
  createOffer
);

// ✅ الحصول على عروض المستخدم الحالي
router.get('/user', requireAuth, (req, res, next) => {
  console.log('=== USER OFFERS REQUEST ===');
  console.log('User ID:', req.user?.id);
  console.log('User Role:', req.user?.role);
  console.log('User Active:', req.user?.isActive);
  next();
}, getUserOffers);

// ✅ الحصول على العروض القادمة
router.get('/upcoming', requireAuth, getUpcomingOffers);

// ✅ الحصول على العروض (المدراء والشركات فقط)
router.get('/', requireAuth, requireRole(['admin', 'company']), getOffers);

// ✅ إحصائيات العروض (المدراء والشركات)
router.get('/stats', requireAuth, requireRole(['admin', 'company']), getOfferStats);

// ✅ تحديث عرض (المالك أو المدير أو الشركة)
router.put('/:id', requireAuth, requireOwnership, updateOffer);

// ✅ حذف عرض (المالك أو المدير أو الشركة)
router.delete('/:id', requireAuth, requireOwnership, deleteOffer);

module.exports = router;
