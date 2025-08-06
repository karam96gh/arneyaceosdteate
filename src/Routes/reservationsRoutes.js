// src/routes/reservationsRoutes.js - ENHANCED VERSION
const express = require('express');
const router = express.Router();
const {
  createReservation,
  getReservations,
  getUserReservations,
  updateReservation,
  deleteReservation,
  getReservationStats,
  cleanupExpiredReservations,
  getUpcomingReservations
} = require('../controllers/reservationsController');
const { requireAuth, requireRole, requireOwnership } = require('../middleware/auth');

// ✅ إنشاء حجز جديد (جميع المستخدمين المسجلين)
router.post('/', requireAuth, createReservation);

// ✅ الحصول على حجوزات المستخدم الحالي (مع تشخيص)
router.get('/user', requireAuth, (req, res, next) => {
  console.log('=== USER RESERVATIONS REQUEST ===');
  console.log('User ID:', req.user?.id);
  console.log('User Role:', req.user?.role);
  console.log('User Active:', req.user?.isActive);
  next();
}, getUserReservations);

// ✅ NEW - الحصول على الحجوزات القادمة
router.get('/upcoming', requireAuth, getUpcomingReservations);

// ✅ الحصول على الحجوزات (المدراء والشركات فقط)
router.get('/', requireAuth, requireRole(['admin', 'company']), getReservations);

// ✅ إحصائيات الحجوزات (المدراء والشركات)
router.get('/stats', requireAuth, requireRole(['admin', 'company']), getReservationStats);

// ✅ تحديث حجز (المالك أو المدير أو الشركة)
router.put('/:id', requireAuth, requireOwnership, updateReservation);

// ✅ حذف حجز (المالك أو المدير أو الشركة)
router.delete('/:id', requireAuth, requireOwnership, deleteReservation);

// ✅ NEW - نظافة الحجوزات المنتهية (المدراء فقط)
router.post('/cleanup', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const cleanedCount = await cleanupExpiredReservations();
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired reservations`,
      cleanedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'CLEANUP_ERROR', message: error.message }
    });
  }
});

// ✅ NEW - تشخيص الحجوزات للمستخدم
router.get('/debug/user/:userId?', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId ? parseInt(userId) : req.user.id;
    
    const { dbManager } = require('../config/database');
    const prisma = dbManager.getPrisma();
    
    // معلومات المستخدم
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        userId: targetUserId
      });
    }
    
    // إحصائيات الحجوزات
    const reservationStats = await prisma.reservation.groupBy({
      by: ['status'],
      where: { userId: targetUserId },
      _count: { id: true }
    });
    
    // آخر الحجوزات
    const recentReservations = await prisma.reservation.findMany({
      where: { userId: targetUserId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            companyId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    res.json({
      user,
      stats: {
        total: reservationStats.reduce((sum, stat) => sum + stat._count.id, 0),
        byStatus: reservationStats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count.id;
          return acc;
        }, {})
      },
      recentReservations: recentReservations.map(r => ({
        id: r.id,
        propertyId: r.propertyId,
        propertyTitle: r.property.title,
        propertyCompanyId: r.property.companyId,
        reservationCompanyId: r.companyId,
        status: r.status.toLowerCase(),
        visitDate: r.visitDate,
        createdAt: r.createdAt
      })),
      debug: {
        timestamp: new Date().toISOString(),
        requestedBy: req.user.id,
        targetUser: targetUserId
      }
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;