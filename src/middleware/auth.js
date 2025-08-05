// src/middleware/auth.js - FIXED VERSION
const jwt = require('jsonwebtoken');
const { dbManager } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
console.log('🔑 JWT_SECRET configured:', JWT_SECRET ? 'Secret exists' : 'Using default secret');

// ✅ دالة مساعدة لتحويل enum إلى role
const enumToRole = (enumValue) => {
  const mapping = {
    'USER': 'user',
    'USER_VIP': 'user_vip',
    'ADMIN': 'admin', 
    'COMPANY': 'company'
  };
  return mapping[enumValue] || enumValue?.toLowerCase();
};

// التحقق من الـ token - FIXED
const requireAuth = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware called');
    console.log('Headers:', req.headers);
    console.log('Authorization header:', req.header('Authorization'));
    
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    console.log('Auth header:', authHeader);
    console.log('Token extracted:', token ? `Token exists (length: ${token.length})` : 'No token');
    console.log('Token starts with:', token ? token.substring(0, 20) + '...' : 'N/A');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ 
        success: false,
        error: { code: 'NO_TOKEN', message: 'Access token is required' }
      });
    }

    console.log('🔐 Verifying JWT token...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    const prisma = dbManager.getPrisma();
    console.log('🔍 Looking for user with ID:', decoded.id);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        username: true, 
        role: true, 
        isActive: true,
        companyName: true // ✅ إضافة معلومات الشركة
      }
    });

    console.log('Found user:', user);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      });
    }

    // ✅ تحويل role وإضافة معلومات إضافية
    req.user = {
      ...user,
      role: enumToRole(user.role), // ✅ تحويل للاستخدام
      isCompany: user.role === 'COMPANY'
    };
    
    console.log('Final req.user object:', req.user);
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    let errorCode = 'TOKEN_ERROR';
    let errorMessage = 'Invalid token';
    
    if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorCode = 'INVALID_TOKEN';
      errorMessage = 'Invalid token format';
    } else if (error.name === 'NotBeforeError') {
      errorCode = 'TOKEN_NOT_ACTIVE';
      errorMessage = 'Token not yet active';
    }
    
    res.status(401).json({
      success: false,
      error: { code: errorCode, message: errorMessage }
    });
  }
};

// التحقق من الدور - FIXED
const requireRole = (roles) => {
  return (req, res, next) => {
    console.log('🔐 requireRole middleware called');
    console.log('Required roles:', roles);
    console.log('User object:', req.user);
    console.log('User role:', req.user?.role);
    
    if (!req.user) {
      console.error('❌ No user object in requireRole');
      return res.status(401).json({
        success: false,
        error: { code: 'NO_USER', message: 'Authentication required' }
      });
    }

    // ✅ تحويل الأدوار المطلوبة إلى lowercase للمقارنة
    const normalizedRoles = roles.map(role => role.toLowerCase());
    
    if (!normalizedRoles.includes(req.user.role)) {
      console.error('❌ Insufficient permissions');
      console.error('User role:', req.user.role);
      console.error('Required roles:', normalizedRoles);
      return res.status(403).json({
        success: false,
        error: { 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}` 
        }
      });
    }

    console.log('✅ Role check passed');
    next();
  };
};

// ✅ التحقق من ملكية العقار - FIXED
const requirePropertyOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        message: 'Invalid property ID' 
      });
    }
    
    const prisma = dbManager.getPrisma();
    
    const realEstate = await prisma.realEstate.findUnique({
      where: { id: parseInt(id) },
      select: { 
        companyId: true,
        title: true // للـ debugging
      }
    });

    if (!realEstate) {
      return res.status(404).json({ message: 'Real estate not found' });
    }

    // المدير يمكنه الوصول لكل شيء
    if (req.user.role === 'admin') {
      return next();
    }
    
    // الشركة تصل فقط لعقاراتها
    if (req.user.role === 'company' && realEstate.companyId === req.user.id) {
      return next();
    }

    return res.status(403).json({ 
      message: 'Access denied to this property',
      debug: process.env.NODE_ENV === 'development' ? {
        userRole: req.user.role,
        userId: req.user.id,
        propertyCompanyId: realEstate.companyId
      } : undefined
    });
  } catch (error) {
    console.error('Property ownership middleware error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ التحقق من ملكية المبنى - FIXED
const requireBuildingOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        message: 'Invalid building ID' 
      });
    }
    
    const prisma = dbManager.getPrisma();
    
    const building = await prisma.building.findUnique({
      where: { id: id }, // UUID string
      select: { 
        companyId: true,
        title: true // للـ debugging
      }
    });

    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // المدير يمكنه الوصول لكل شيء
    if (req.user.role === 'admin') {
      return next();
    }
    
    // الشركة تصل فقط لمبانيها
    if (req.user.role === 'company' && building.companyId === req.user.id) {
      return next();
    }

    return res.status(403).json({ 
      message: 'Access denied to this building',
      debug: process.env.NODE_ENV === 'development' ? {
        userRole: req.user.role,
        userId: req.user.id,
        buildingCompanyId: building.companyId
      } : undefined
    });
  } catch (error) {
    console.error('Building ownership middleware error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ التحقق من ملكية عنصر المبنى - FIXED
const requireBuildingItemOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        message: 'Invalid building item ID' 
      });
    }
    
    const prisma = dbManager.getPrisma();
    
    const buildingItem = await prisma.buildingItem.findUnique({
      where: { id: id }, // UUID string
      select: { 
        companyId: true,
        name: true, // للـ debugging
        building: {
          select: {
            companyId: true,
            title: true
          }
        }
      }
    });

    if (!buildingItem) {
      return res.status(404).json({ message: 'Building item not found' });
    }

    // المدير يمكنه الوصول لكل شيء
    if (req.user.role === 'admin') {
      return next();
    }
    
    // الشركة تصل فقط لعناصر مبانيها
    if (req.user.role === 'company') {
      // التحقق من ملكية العنصر مباشرة أو من خلال المبنى
      const isOwner = buildingItem.companyId === req.user.id || 
                     buildingItem.building?.companyId === req.user.id;
      
      if (isOwner) {
        return next();
      }
    }

    return res.status(403).json({ 
      message: 'Access denied to this building item',
      debug: process.env.NODE_ENV === 'development' ? {
        userRole: req.user.role,
        userId: req.user.id,
        itemCompanyId: buildingItem.companyId,
        buildingCompanyId: buildingItem.building?.companyId
      } : undefined
    });
  } catch (error) {
    console.error('Building item ownership middleware error:', error);
    res.status(500).json({ error: error.message });
  }
};

// التحقق من ملكية المورد حسب النوع الموجود - FIXED
const requireOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid ID parameter' }
      });
    }
    
    const prisma = dbManager.getPrisma();
    
    // للحجوزات
    if (req.baseUrl.includes('reservations')) {
      const reservation = await prisma.reservation.findUnique({
        where: { id: parseInt(id) },
        select: { 
          userId: true, 
          companyId: true,
          property: {
            select: {
              title: true,
              companyId: true
            }
          }
        }
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Reservation not found' }
        });
      }

      // المدير يمكنه الوصول لكل شيء
      if (req.user.role === 'admin') {
        return next();
      }
      
      // المستخدم العادي يصل لحجوزاته فقط
      if ((req.user.role === 'user' || req.user.role === 'user_vip') && 
          reservation.userId === req.user.id) {
        return next();
      }
      
      // الشركة تصل للحجوزات المرتبطة بها أو بعقاراتها
      if (req.user.role === 'company') {
        const hasAccess = reservation.companyId === req.user.id || 
                         reservation.property?.companyId === req.user.id;
        if (hasAccess) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' },
        debug: process.env.NODE_ENV === 'development' ? {
          userRole: req.user.role,
          userId: req.user.id,
          reservationUserId: reservation.userId,
          reservationCompanyId: reservation.companyId,
          propertyCompanyId: reservation.property?.companyId
        } : undefined
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