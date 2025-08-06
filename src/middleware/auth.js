// src/middleware/auth.js - COMPLETE FIXED VERSION
const jwt = require('jsonwebtoken');
const { dbManager } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

// ✅ التحقق من الـ token - COMPLETELY FIXED
const requireAuth = async (req, res, next) => {
  console.log('=== REQUIRE AUTH MIDDLEWARE START ===');
  try {
    // ✅ استخراج التوكن بطرق متعددة
    let token = null;
    
    // الطريقة الأولى: Authorization header
    const authHeader = req.header('Authorization') || req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '').trim();
    }
    
    // الطريقة الثانية: x-access-token header (backup)
    if (!token) {
      token = req.header('x-access-token');
    }
    
    // الطريقة الثالثة: query parameter (للاختبار فقط)
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    console.log('=== AUTH DEBUG INFO ===');
    console.log('Authorization header:', authHeader);
    console.log('Token extracted:', token ? 'YES (length: ' + token.length + ')' : 'NO');
    console.log('All headers:', Object.keys(req.headers));
    
    if (!token) {
      console.log('❌ No token found');
      return res.status(401).json({ 
        success: false,
        error: { 
          code: 'NO_TOKEN', 
          message: 'Access token is required. Please provide Authorization header with Bearer token.' 
        },
        debug: {
          authHeader: authHeader ? 'Present but invalid format' : 'Missing',
          expectedFormat: 'Authorization: Bearer <your-token>'
        }
      });
    }

    // ✅ التحقق من صحة التوكن
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token decoded successfully:', { 
        id: decoded.id, 
        username: decoded.username, 
        role: decoded.role 
      });
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      
      let errorCode = 'INVALID_TOKEN';
      let errorMessage = 'Invalid or malformed token';
      
      if (jwtError.name === 'TokenExpiredError') {
        errorCode = 'TOKEN_EXPIRED';
        errorMessage = 'Token has expired. Please login again.';
      } else if (jwtError.name === 'JsonWebTokenError') {
        errorCode = 'INVALID_TOKEN_FORMAT';
        errorMessage = 'Invalid token format or signature';
      } else if (jwtError.name === 'NotBeforeError') {
        errorCode = 'TOKEN_NOT_ACTIVE';
        errorMessage = 'Token not yet active';
      }
      
      return res.status(401).json({
        success: false,
        error: { code: errorCode, message: errorMessage }
      });
    }

    // ✅ التحقق من وجود المستخدم في قاعدة البيانات
    const prisma = dbManager.getPrisma();
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        username: true, 
        role: true, 
        isActive: true,
        fullName: true,
        email: true,
        companyName: true,
        companyLicense: true
      }
    });

    console.log('Database user lookup:', user ? 'FOUND' : 'NOT_FOUND');

    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        error: { 
          code: 'USER_NOT_FOUND', 
          message: 'User not found. Token may be invalid or user deleted.' 
        }
      });
    }

    if (!user.isActive) {
      console.log('❌ User account is disabled');
      return res.status(401).json({
        success: false,
        error: { 
          code: 'ACCOUNT_DISABLED', 
          message: 'User account is disabled. Please contact administrator.' 
        }
      });
    }

    // ✅ تعيين معلومات المستخدم في req.user
    req.user = {
      id: user.id,
      username: user.username,
      role: enumToRole(user.role), // تحويل من ENUM إلى string
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      companyName: user.companyName,
      companyLicense: user.companyLicense,
      isCompany: user.role === 'COMPANY',
      originalRole: user.role // الاحتفاظ بالقيمة الأصلية للمقارنات
    };
    
    console.log('✅ User successfully authenticated:', {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      isCompany: req.user.isCompany
    });
    console.log('=== REQUIRE AUTH MIDDLEWARE END ===');
    
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    // ✅ معالجة أخطاء قاعدة البيانات
    if (error.code === 'P2021' || error.code === 'P2022') {
      return res.status(503).json({
        success: false,
        error: { 
          code: 'DATABASE_ERROR', 
          message: 'Database connection error. Please try again later.' 
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: { 
        code: 'AUTH_ERROR', 
        message: 'Authentication system error. Please try again.' 
      }
    });
  }
};

// ✅ التحقق من الدور - ENHANCED
const requireRole = (roles) => {
  return (req, res, next) => {
    console.log('=== ROLE CHECK MIDDLEWARE ===');
    console.log('Required roles:', roles);
    console.log('User role:', req.user?.role);
    
    if (!req.user) {
      console.log('❌ No user in request');
      return res.status(401).json({
        success: false,
        error: { 
          code: 'NO_USER', 
          message: 'Authentication required. Please login first.' 
        }
      });
    }

    // تطبيع الأدوار للمقارنة
    const normalizedRoles = Array.isArray(roles) 
      ? roles.map(role => role.toLowerCase()) 
      : [roles.toLowerCase()];
    
    const userRole = req.user.role.toLowerCase();
    
    if (!normalizedRoles.includes(userRole)) {
      console.log('❌ Insufficient permissions');
      return res.status(403).json({
        success: false,
        error: { 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: `Access denied. Required roles: ${normalizedRoles.join(', ')}. Your role: ${userRole}` 
        }
      });
    }

    console.log('✅ Role check passed');
    next();
  };
};

// ✅ التحقق من ملكية العقار - COMPLETE FIX
const requirePropertyOwnership = async (req, res, next) => {
  try {
    console.log('=== PROPERTY OWNERSHIP CHECK ===');
    const { id } = req.params;
    
    console.log('Property ID:', id);
    console.log('User:', req.user?.id, req.user?.role);
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid property ID format' }
      });
    }
    
    const prisma = dbManager.getPrisma();
    
    const realEstate = await prisma.realEstate.findUnique({
      where: { id: parseInt(id) },
      select: { 
        id: true,
        companyId: true,
        title: true,
        company: {
          select: {
            id: true,
            companyName: true
          }
        }
      }
    });

    console.log('Property found:', !!realEstate);
    console.log('Property company ID:', realEstate?.companyId);

    if (!realEstate) {
      return res.status(404).json({ 
        success: false,
        error: { code: 'PROPERTY_NOT_FOUND', message: 'Real estate property not found' }
      });
    }

    // ✅ المدير يمكنه الوصول لكل شيء
    if (req.user.role === 'admin') {
      console.log('✅ Admin access granted');
      return next();
    }
    
    // ✅ الشركة تصل فقط لعقاراتها
    if (req.user.role === 'company' && realEstate.companyId === req.user.id) {
      console.log('✅ Company ownership verified');
      return next();
    }

    console.log('❌ Access denied');
    return res.status(403).json({ 
      success: false,
      error: { 
        code: 'ACCESS_DENIED', 
        message: 'You do not have permission to access this property' 
      },
      debug: process.env.NODE_ENV === 'development' ? {
        userRole: req.user.role,
        userId: req.user.id,
        propertyCompanyId: realEstate.companyId,
        propertyTitle: realEstate.title
      } : undefined
    });
  } catch (error) {
    console.error('❌ Property ownership check error:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error checking property ownership' }
    });
  }
};

// ✅ التحقق من ملكية المبنى
const requireBuildingOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'INVALID_ID', message: 'Building ID is required' }
      });
    }
    
    const prisma = dbManager.getPrisma();
    
    const building = await prisma.building.findUnique({
      where: { id: id },
      select: { 
        id: true,
        companyId: true,
        title: true
      }
    });

    if (!building) {
      return res.status(404).json({ 
        success: false,
        error: { code: 'BUILDING_NOT_FOUND', message: 'Building not found' }
      });
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
      success: false,
      error: { 
        code: 'ACCESS_DENIED', 
        message: 'You do not have permission to access this building' 
      }
    });
  } catch (error) {
    console.error('Building ownership middleware error:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error checking building ownership' }
    });
  }
};

// ✅ التحقق من ملكية عنصر المبنى
const requireBuildingItemOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'INVALID_ID', message: 'Building item ID is required' }
      });
    }
    
    const prisma = dbManager.getPrisma();
    
    const buildingItem = await prisma.buildingItem.findUnique({
      where: { id: id },
      select: { 
        id: true,
        companyId: true,
        name: true,
        building: {
          select: {
            companyId: true,
            title: true
          }
        }
      }
    });

    if (!buildingItem) {
      return res.status(404).json({ 
        success: false,
        error: { code: 'BUILDING_ITEM_NOT_FOUND', message: 'Building item not found' }
      });
    }

    // المدير يمكنه الوصول لكل شيء
    if (req.user.role === 'admin') {
      return next();
    }
    
    // الشركة تصل فقط لعناصر مبانيها
    if (req.user.role === 'company') {
      const isOwner = buildingItem.companyId === req.user.id || 
                     buildingItem.building?.companyId === req.user.id;
      
      if (isOwner) {
        return next();
      }
    }

    return res.status(403).json({ 
      success: false,
      error: { 
        code: 'ACCESS_DENIED', 
        message: 'You do not have permission to access this building item' 
      }
    });
  } catch (error) {
    console.error('Building item ownership middleware error:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error checking building item ownership' }
    });
  }
};

// ✅ التحقق من ملكية المورد العام
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
          error: { code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' }
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
        error: { code: 'ACCESS_DENIED', message: 'Access denied to this reservation' }
      });
    }

    next();
  } catch (error) {
    console.error('Ownership middleware error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error checking ownership' }
    });
  }
};

// ✅ اختبار التوكن (للتطوير)
const testAuth = async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({
        status: 'NO_TOKEN',
        authHeader: authHeader,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const prisma = dbManager.getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        username: true, 
        role: true, 
        isActive: true,
        companyName: true
      }
    });
    
    res.json({
      status: 'SUCCESS',
      token: {
        length: token.length,
        decoded: decoded,
        valid: true
      },
      user: user,
      userFormatted: user ? {
        ...user,
        role: enumToRole(user.role),
        isCompany: user.role === 'COMPANY'
      } : null
    });
  } catch (error) {
    res.json({
      status: 'ERROR',
      error: error.message,
      type: error.name
    });
  }
};

module.exports = { 
  requireAuth, 
  requireRole, 
  requireOwnership,
  requirePropertyOwnership,
  requireBuildingOwnership,
  requireBuildingItemOwnership,
  testAuth // للاختبار
};