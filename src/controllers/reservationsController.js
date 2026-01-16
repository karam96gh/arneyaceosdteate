// src/controllers/reservationsController.js - FIXED VERSION
const { dbManager } = require('../config/database');
const { buildGeneralFileUrl } = require('../config/upload');

// إنشاء حجز جديد - FIXED
const createReservation = async (req, res) => {
  try {
    console.log('=== CREATE RESERVATION START ===');
    console.log('User:', req.user?.id, req.user?.role, req.user?.username);

    const { propertyId, visitDate, visitTime, notes } = req.body;

    // الحصول على اسم ملف صورة الهوية إذا تم رفعها
    const idImage = req.file ? req.file.filename : null;
    console.log('ID Image uploaded:', idImage);
    
    // التحقق من البيانات المطلوبة
    if (!propertyId || !visitDate || !visitTime) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Property ID, visit date, and visit time are required' }
      });
    }

    // التحقق من أن التاريخ في المستقبل
    const visitDateTime = new Date(visitDate);
    const now = new Date();
    
    if (visitDateTime <= now) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'Visit date must be in the future' }
      });
    }

    const prisma = dbManager.getPrisma();
    
    // ✅ الحصول على معلومات العقار والشركة المالكة - FIXED
    const property = await prisma.realEstate.findUnique({
      where: { id: parseInt(propertyId) },
      include: {
        city: { select: { id: true, name: true } },
        neighborhood: { select: { id: true, name: true } },
        company: { 
          select: { 
            id: true, 
            companyName: true, 
            phone: true 
          } 
        }
      }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROPERTY_NOT_FOUND', message: 'Property not found' }
      });
    }

    console.log('Property found:', property.id);
    console.log('Property company:', property.companyId);

    // ✅ تحديد الشركة المالكة - FIXED
    let companyId = property.companyId; // استخدام شركة العقار
    
    console.log('Final companyId:', companyId);

    // ✅ فحص تضارب الحجوزات - NEW
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        propertyId: parseInt(propertyId),
        visitDate: {
          gte: new Date(visitDateTime.toDateString()), // بداية اليوم
          lt: new Date(new Date(visitDateTime.toDateString()).getTime() + 24 * 60 * 60 * 1000) // نهاية اليوم
        },
        visitTime: visitTime,
        status: { 
          in: ['PENDING', 'CONFIRMED'] 
        }
      },
      include: {
        user: { select: { fullName: true } }
      }
    });

    if (existingReservation) {
      return res.status(409).json({
        success: false,
        error: { 
          code: 'TIME_SLOT_TAKEN', 
          message: `This time slot is already booked by ${existingReservation.user.fullName}` 
        }
      });
    }

    // ✅ فحص إذا كان المستخدم لديه حجز معلق للنفس العقار - NEW
    const userPendingReservation = await prisma.reservation.findFirst({
      where: {
        propertyId: parseInt(propertyId),
        userId: req.user.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    if (userPendingReservation) {
      return res.status(409).json({
        success: false,
        error: { 
          code: 'EXISTING_RESERVATION', 
          message: 'You already have a pending or confirmed reservation for this property' 
        }
      });
    }

    // إنشاء الحجز
    const reservation = await prisma.reservation.create({
      data: {
        propertyId: parseInt(propertyId),
        userId: req.user.id,
        companyId: companyId, // ✅ FIXED - الآن يحفظ الشركة الصحيحة
        visitDate: visitDateTime,
        visitTime,
        notes,
        idImage, // ✅ حفظ اسم ملف صورة الهوية
        status: 'PENDING'
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            coverImage: true,
            city: { select: { name: true } },
            neighborhood: { select: { name: true } }
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            companyName: true,
            phone: true
          }
        }
      }
    });

    console.log('✅ Reservation created successfully:', reservation.id);

    // تنسيق الاستجابة
    const formattedReservation = {
      id: reservation.id,
      propertyId: reservation.propertyId,
      propertyTitle: reservation.property.title,
      propertyPrice: reservation.property.price,
      propertyImage: reservation.property.coverImage,
      propertyLocation: `${reservation.property.city.name}, ${reservation.property.neighborhood.name}`,
      userId: reservation.userId,
      userName: reservation.user.fullName,
      userPhone: reservation.user.phone,
      userEmail: reservation.user.email,
      companyId: reservation.companyId,
      companyName: reservation.company?.companyName || 'No company assigned',
      companyPhone: reservation.company?.phone,
      status: reservation.status.toLowerCase(),
      visitDate: reservation.visitDate.toISOString().split('T')[0],
      visitTime: reservation.visitTime,
      notes: reservation.notes,
      idImage: reservation.idImage ? buildGeneralFileUrl(reservation.idImage) : null, // ✅ إرجاع رابط صورة الهوية
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    };

    res.status(201).json({
      success: true,
      data: formattedReservation,
      message: 'Reservation created successfully'
    });

  } catch (error) {
    console.error('❌ Create reservation error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// الحصول على حجوزات المستخدم الحالي - ENHANCED
const getUserReservations = async (req, res) => {
  try {
    console.log('=== GET USER RESERVATIONS ===');
    console.log('User ID:', req.user?.id);
    console.log('User Role:', req.user?.role);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'User authentication required' }
      });
    }

    const prisma = dbManager.getPrisma();
    
    // ✅ استعلام محسن مع تفاصيل أكثر
    const reservations = await prisma.reservation.findMany({
      where: { userId: req.user.id },
      include: {
        property: {
          include: {
            city: { select: { name: true } },
            neighborhood: { select: { name: true } },
            finalType: { select: { name: true } },
            // ✅ إضافة معلومات إضافية
            mainCategory: { select: { name: true } }
          }
        },
        company: {
          select: {
            id: true,
            companyName: true,
            phone: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${reservations.length} reservations for user ${req.user.id}`);

    // ✅ تحويل محسن للعرض
    const formattedReservations = reservations.map(reservation => {
      const propertyLocation = reservation.property.city && reservation.property.neighborhood
        ? `${reservation.property.city.name}, ${reservation.property.neighborhood.name}`
        : 'Location not specified';

      return {
        id: reservation.id,
        propertyId: reservation.propertyId,
        propertyTitle: reservation.property.title,
        propertyPrice: reservation.property.price,
        propertyImage: reservation.property.coverImage,
        propertyLocation: propertyLocation,
        propertyType: reservation.property.finalType?.name || reservation.property.mainCategory?.name || 'Unknown',
        companyId: reservation.companyId,
        companyName: reservation.company?.companyName || 'No company assigned',
        companyPhone: reservation.company?.phone,
        companyEmail: reservation.company?.email,
        status: reservation.status.toLowerCase(),
        visitDate: reservation.visitDate instanceof Date
          ? reservation.visitDate.toISOString().split('T')[0]
          : reservation.visitDate,
        visitTime: reservation.visitTime,
        notes: reservation.notes,
        idImage: reservation.idImage ? buildGeneralFileUrl(reservation.idImage) : null, // ✅ إرجاع رابط صورة الهوية
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
        // ✅ إضافة معلومات مفيدة
        canCancel: reservation.status === 'PENDING' && new Date(reservation.visitDate) > new Date(),
        isUpcoming: new Date(reservation.visitDate) > new Date()
      };
    });

    // ✅ إضافة إحصائيات للمستخدم
    const stats = {
      total: formattedReservations.length,
      pending: formattedReservations.filter(r => r.status === 'pending').length,
      confirmed: formattedReservations.filter(r => r.status === 'confirmed').length,
      completed: formattedReservations.filter(r => r.status === 'completed').length,
      cancelled: formattedReservations.filter(r => r.status === 'cancelled').length,
      upcoming: formattedReservations.filter(r => r.isUpcoming).length
    };

    res.json({
      success: true,
      data: {
        reservations: formattedReservations,
        stats: stats
      },
      message: `Found ${formattedReservations.length} reservations`
    });

  } catch (error) {
    console.error('❌ Get user reservations error:', error);
    res.status(500).json({
      success: false,  
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// الحصول على الحجوزات (للمدراء والشركات) - FIXED
const getReservations = async (req, res) => {
  try {
    const { status, propertyId, userId, page = 1, limit = 10 } = req.query;
    const prisma = dbManager.getPrisma();
    
    let whereClause = {};
    
    // ✅ تطبيق الفلاتر حسب الدور - FIXED
    if (req.user.role === 'company') {
      // ✅ الشركة تشاهد الحجوزات المرتبطة بها أو بعقاراتها
      whereClause.OR = [
        { companyId: req.user.id }, // الحجوزات المرتبطة مباشرة بالشركة
        { 
          property: { 
            companyId: req.user.id // الحجوزات لعقارات الشركة
          } 
        }
      ];
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
    }

    // إضافة الفلاتر الأخرى
    if (status) {
      whereClause.status = status.toUpperCase();
    }
    if (propertyId) whereClause.propertyId = parseInt(propertyId);
    if (userId) whereClause.userId = parseInt(userId);

    console.log('Where clause for getReservations:', JSON.stringify(whereClause, null, 2));

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where: whereClause,
        include: {
          property: {
            include: {
              city: { select: { name: true } },
              neighborhood: { select: { name: true } }
            }
          },
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true
            }
          },
          company: {
            select: {
              id: true,
              companyName: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.reservation.count({ where: whereClause })
    ]);

    console.log(`Found ${reservations.length} reservations for ${req.user.role} user ${req.user.id}`);

    // تحويل الحجوزات للعرض
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      propertyId: reservation.propertyId,
      propertyTitle: reservation.property.title,
      propertyPrice: reservation.property.price,
      propertyImage: reservation.property.coverImage,
      propertyLocation: reservation.property.city && reservation.property.neighborhood
        ? `${reservation.property.city.name}, ${reservation.property.neighborhood.name}`
        : undefined,
      userId: reservation.userId,
      userName: reservation.user.fullName,
      userPhone: reservation.user.phone,
      userEmail: reservation.user.email,
      companyId: reservation.companyId,
      companyName: reservation.company?.companyName || 'No company assigned',
      companyPhone: reservation.company?.phone,
      status: reservation.status.toLowerCase(),
      visitDate: reservation.visitDate instanceof Date
        ? reservation.visitDate.toISOString().split('T')[0]
        : reservation.visitDate,
      visitTime: reservation.visitTime,
      notes: reservation.notes,
      idImage: reservation.idImage ? buildGeneralFileUrl(reservation.idImage) : null, // ✅ إرجاع رابط صورة الهوية
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    }));

    res.json({
      success: true,
      data: {
        reservations: formattedReservations,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      },
      message: `Found ${total} total reservations`
    });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// تحديث حجز - ENHANCED
const updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, visitDate, visitTime, notes } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Valid reservation ID is required' }
      });
    }

    const prisma = dbManager.getPrisma();
    
    // ✅ التحقق من وجود الحجز وصلاحية التحديث
    const existingReservation = await prisma.reservation.findUnique({
      where: { id: parseInt(id) },
      include: {
        property: { select: { companyId: true, title: true } },
        user: { select: { fullName: true } }
      }
    });

    if (!existingReservation) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' }
      });
    }

    // ✅ فحص الصلاحيات
    const canUpdate = req.user.role === 'admin' ||
                     (req.user.role === 'company' && (
                       existingReservation.companyId === req.user.id ||
                       existingReservation.property.companyId === req.user.id
                     )) ||
                     (req.user.id === existingReservation.userId);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'You do not have permission to update this reservation' }
      });
    }
    
    const updateData = {};
    
    // تحديث الحالة
    if (status) {
      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
      if (!validStatuses.includes(status.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Invalid status value' }
        });
      }
      updateData.status = status.toUpperCase();
    }
    
    // تحديث التاريخ
    if (visitDate) {
      const visitDateTime = new Date(visitDate);
      if (visitDateTime <= new Date()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_DATE', message: 'Visit date must be in the future' }
        });
      }
      updateData.visitDate = visitDateTime;
    }
    
    if (visitTime) updateData.visitTime = visitTime;
    if (notes !== undefined) updateData.notes = notes;

    const reservation = await prisma.reservation.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        property: {
          include: {
            city: { select: { name: true } },
            neighborhood: { select: { name: true } }
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            companyName: true,
            phone: true
          }
        }
      }
    });

    // تنسيق الاستجابة
    const formattedReservation = {
      id: reservation.id,
      propertyId: reservation.propertyId,
      propertyTitle: reservation.property.title,
      propertyPrice: reservation.property.price,
      propertyImage: reservation.property.coverImage,
      propertyLocation: `${reservation.property.city.name}, ${reservation.property.neighborhood.name}`,
      userId: reservation.userId,
      userName: reservation.user.fullName,
      userPhone: reservation.user.phone,
      userEmail: reservation.user.email,
      companyId: reservation.companyId,
      companyName: reservation.company?.companyName || 'No company assigned',
      companyPhone: reservation.company?.phone,
      status: reservation.status.toLowerCase(),
      visitDate: reservation.visitDate instanceof Date
        ? reservation.visitDate.toISOString().split('T')[0]
        : reservation.visitDate,
      visitTime: reservation.visitTime,
      notes: reservation.notes,
      idImage: reservation.idImage ? buildGeneralFileUrl(reservation.idImage) : null, // ✅ إرجاع رابط صورة الهوية
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    };

    res.json({
      success: true,
      data: formattedReservation,
      message: 'Reservation updated successfully'
    });
  } catch (error) {
    console.error('Update reservation error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// حذف حجز - ENHANCED
const deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Valid reservation ID is required' }
      });
    }

    const prisma = dbManager.getPrisma();
    
    // التحقق من وجود الحجز والصلاحيات
    const existingReservation = await prisma.reservation.findUnique({
      where: { id: parseInt(id) },
      include: {
        property: { select: { companyId: true } }
      }
    });

    if (!existingReservation) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' }
      });
    }

    // فحص الصلاحيات
    const canDelete = req.user.role === 'admin' ||
                     (req.user.role === 'company' && (
                       existingReservation.companyId === req.user.id ||
                       existingReservation.property.companyId === req.user.id
                     )) ||
                     (req.user.id === existingReservation.userId);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'You do not have permission to delete this reservation' }
      });
    }
    
    await prisma.reservation.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Reservation deleted successfully'
    });
  } catch (error) {
    console.error('Delete reservation error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// إحصائيات الحجوزات - FIXED
const getReservationStats = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();
    
    let whereClause = {};
    if (req.user.role === 'company') {
      whereClause.OR = [
        { companyId: req.user.id },
        { property: { companyId: req.user.id } }
      ];
    }

    const [total, pending, confirmed, cancelled, completed] = await Promise.all([
      prisma.reservation.count({ where: whereClause }),
      prisma.reservation.count({ where: { ...whereClause, status: 'PENDING' } }),
      prisma.reservation.count({ where: { ...whereClause, status: 'CONFIRMED' } }),
      prisma.reservation.count({ where: { ...whereClause, status: 'CANCELLED' } }),
      prisma.reservation.count({ where: { ...whereClause, status: 'COMPLETED' } })
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        confirmed,
        cancelled,
        completed
      }
    });
  } catch (error) {
    console.error('Get reservation stats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// ✅ دالة جديدة - تنظيف الحجوزات المنتهية
const cleanupExpiredReservations = async () => {
  try {
    const prisma = dbManager.getPrisma();
    
    const result = await prisma.reservation.updateMany({
      where: {
        visitDate: { lt: new Date() },
        status: 'PENDING'
      },
      data: { 
        status: 'CANCELLED'
      }
    });

    console.log(`✅ Cleaned up ${result.count} expired reservations`);
    return result.count;
  } catch (error) {
    console.error('❌ Error cleaning up expired reservations:', error);
    return 0;
  }
};

// ✅ دالة جديدة - الحصول على الحجوزات القادمة
const getUpcomingReservations = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();
    
    let whereClause = {
      visitDate: { gte: new Date() },
      status: { in: ['PENDING', 'CONFIRMED'] }
    };

    if (req.user.role === 'user' || req.user.role === 'user_vip') {
      whereClause.userId = req.user.id;
    } else if (req.user.role === 'company') {
      whereClause.OR = [
        { companyId: req.user.id },
        { property: { companyId: req.user.id } }
      ];
    }

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            city: { select: { name: true } },
            neighborhood: { select: { name: true } }
          }
        },
        user: {
          select: {
            fullName: true,
            phone: true
          }
        }
      },
      orderBy: { visitDate: 'asc' },
      take: 10
    });

    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      propertyTitle: reservation.property.title,
      propertyImage: reservation.property.coverImage,
      propertyLocation: `${reservation.property.city.name}, ${reservation.property.neighborhood.name}`,
      userName: reservation.user.fullName,
      userPhone: reservation.user.phone,
      status: reservation.status.toLowerCase(),
      visitDate: reservation.visitDate.toISOString().split('T')[0],
      visitTime: reservation.visitTime,
      daysUntilVisit: Math.ceil((reservation.visitDate - new Date()) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      success: true,
      data: formattedReservations,
      message: `Found ${formattedReservations.length} upcoming reservations`
    });
  } catch (error) {
    console.error('Get upcoming reservations error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

module.exports = {
  createReservation,
  getReservations,
  getUserReservations,
  updateReservation,
  deleteReservation,
  getReservationStats,
  cleanupExpiredReservations,
  getUpcomingReservations
};