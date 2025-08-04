// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { dbManager } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// التحقق من الـ token
const requireAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: { code: 'NO_TOKEN', message: 'Access token is required' }
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const prisma = dbManager.getPrisma();
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 'TOKEN_ERROR', message: 'Invalid token' }
    });
  }
};

// التحقق من الدور
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_USER', message: 'Authentication required' }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Access denied' }
      });
    }

    next();
  };
};

// التحقق من ملكية المورد
const requireOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = dbManager.getPrisma();
    
    // للحجوزات
    if (req.baseUrl.includes('reservations')) {
      const reservation = await prisma.reservation.findUnique({
        where: { id: parseInt(id) },
        select: { userId: true, companyId: true }
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Reservation not found' }
        });
      }

      // المدير يمكنه الوصول لكل شيء
      if (req.user.role === 'admin') return next();
      
      // المستخدم يمكنه الوصول لحجوزاته فقط
      if (req.user.role === 'user' || req.user.role === 'user_vip') {
        if (reservation.userId === req.user.id) return next();
      }
      
      // الشركة يمكنها الوصول لحجوزات عقاراتها
      if (req.user.role === 'company') {
        if (reservation.companyId === req.user.id) return next();
      }

      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

module.exports = { requireAuth, requireRole, requireOwnership };