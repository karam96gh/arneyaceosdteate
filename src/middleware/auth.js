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

    req.user = {
      ...user,
      role: user.role.toLowerCase()
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
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
        error: { 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}` 
        }
      });
    }

    next();
  };
};

// ✅ إضافة middleware للتحقق من ملكية العقار
const requirePropertyOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = dbManager.getPrisma();
    
    const realEstate = await prisma.realEstate.findUnique({
      where: { id: parseInt(id) },
      select: { companyId: true }
    });

    if (!realEstate) {
      return res.status(404).json({ message: 'Real estate not found' });
    }

    if (req.user.role === 'admin') return next();
    
    if (req.user.role === 'company' && realEstate.companyId === req.user.id) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied to property' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ إضافة middleware للتحقق من ملكية المبنى
const requireBuildingOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = dbManager.getPrisma();
    
    const building = await prisma.building.findUnique({
      where: { id: id },
      select: { companyId: true }
    });

    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    if (req.user.role === 'admin') return next();
    
    if (req.user.role === 'company' && building.companyId === req.user.id) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied to building' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ إضافة middleware للتحقق من ملكية عنصر المبنى
const requireBuildingItemOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = dbManager.getPrisma();
    
    const buildingItem = await prisma.buildingItem.findUnique({
      where: { id: id },
      select: { companyId: true }
    });

    if (!buildingItem) {
      return res.status(404).json({ message: 'Building item not found' });
    }

    if (req.user.role === 'admin') return next();
    
    if (req.user.role === 'company' && buildingItem.companyId === req.user.id) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied to building item' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// التحقق من ملكية المورد حسب النوع الموجود
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

      if (req.user.role === 'admin') return next();
      
      if (req.user.role === 'user' || req.user.role === 'user_vip') {
        if (reservation.userId === req.user.id) return next();
      }
      
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
    console.error('Ownership middleware error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

module.exports = { 
  requireAuth, 
  requireRole, 
  requireOwnership,
  requirePropertyOwnership,
  requireBuildingOwnership,
  requireBuildingItemOwnership
};