// src/controllers/reservationsController.js
const { dbManager } = require('../config/database');

// إنشاء حجز جديد
const createReservation = async (req, res) => {
  try {
    const { propertyId, visitDate, visitTime, notes } = req.body;
    
    if (!propertyId || !visitDate || !visitTime) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Property ID, visit date, and visit time are required' }
      });
    }

    // التحقق من أن التاريخ في المستقبل
    const visitDateTime = new Date(visitDate);
    if (visitDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'Visit date must be in the future' }
      });
    }

    const prisma = dbManager.getPrisma();
    
    // التحقق من وجود العقار
    const property = await prisma.realEstate.findUnique({
      where: { id: parseInt(propertyId) },
      include: {
        city: { select: { name: true } },
        neighborhood: { select: { name: true } }
      }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROPERTY_NOT_FOUND', message: 'Property not found' }
      });
    }

    // الحصول على بيانات المستخدم
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // تحديد الشركة المالكة للعقار (إذا كان العقار يخص شركة)
    let companyId = null;
    // هنا يمكن إضافة منطق لتحديد الشركة المالكة للعقار

    const reservation = await prisma.reservation.create({
      data: {
        propertyId: parseInt(propertyId),
        userId: req.user.id,
        companyId,
        visitDate: visitDateTime,
        visitTime,
        notes
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            coverImage: true
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
            companyName: true
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
      userId: reservation.userId,
      userName: reservation.user.fullName,
      userPhone: reservation.user.phone,
      userEmail: reservation.user.email,
      companyId: reservation.companyId,
      companyName: reservation.company?.companyName,
      status: reservation.status,
      visitDate: reservation.visitDate.toISOString().split('T')[0],
      visitTime: reservation.visitTime,
      notes: reservation.notes,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    };

    res.status(201).json(formattedReservation);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// الحصول على الحجوزات (للمدراء والشركات)
const getReservations = async (req, res) => {
  try {
    const { status, propertyId, userId, page = 1, limit = 10 } = req.query;
    const prisma = dbManager.getPrisma();
    
    let whereClause = {};
    
    // تطبيق الفلاتر حسب الدور
    if (req.user.role === 'company') {
      whereClause.companyId = req.user.id;
    } else if (req.user.role !== 'admin') {
      // إذا لم يكن مدير أو شركة، منع الوصول
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
    }

    // إضافة الفلاتر
    if (status) whereClause.status = status;
    if (propertyId) whereClause.propertyId = parseInt(propertyId);
    if (userId) whereClause.userId = parseInt(userId);

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where: whereClause,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              price: true,
              coverImage: true
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
              companyName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.reservation.count({ where: whereClause })
    ]);

    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      propertyId: reservation.propertyId,
      propertyTitle: reservation.property.title,
      propertyPrice: reservation.property.price,
      propertyImage: reservation.property.coverImage,
      userId: reservation.userId,
      userName: reservation.user.fullName,
      userPhone: reservation.user.phone,
      userEmail: reservation.user.email,
      companyId: reservation.companyId,
      companyName: reservation.company?.companyName,
      status: reservation.status,
      visitDate: reservation.visitDate.toISOString().split('T')[0],
      visitTime: reservation.visitTime,
      notes: reservation.notes,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    }));

    res.json({
      reservations: formattedReservations,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// الحصول على حجوزات المستخدم الحالي
const getUserReservations = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();
    
    const reservations = await prisma.reservation.findMany({
      where: { userId: req.user.id },
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
        company: {
          select: {
            id: true,
            companyName: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      propertyId: reservation.propertyId,
      propertyTitle: reservation.property.title,
      propertyPrice: reservation.property.price,
      propertyImage: reservation.property.coverImage,
      propertyLocation: `${reservation.property.city.name}, ${reservation.property.neighborhood.name}`,
      companyId: reservation.companyId,
      companyName: reservation.company?.companyName,
      companyPhone: reservation.company?.phone,
      status: reservation.status,
      visitDate: reservation.visitDate.toISOString().split('T')[0],
      visitTime: reservation.visitTime,
      notes: reservation.notes,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    }));

    res.json(formattedReservations);
  } catch (error) {
    res.status(500).json({
      success: false,  
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// تحديث حجز
const updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, visitDate, visitTime, notes } = req.body;
    
    const prisma = dbManager.getPrisma();
    
    const updateData = {};
    if (status) updateData.status = status;
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
          select: {
            id: true,
            title: true,
            price: true,
            coverImage: true
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
            companyName: true
          }
        }
      }
    });

    const formattedReservation = {
      id: reservation.id,
      propertyId: reservation.propertyId,
      propertyTitle: reservation.property.title,
      propertyPrice: reservation.property.price,
      propertyImage: reservation.property.coverImage,
      userId: reservation.userId,
      userName: reservation.user.fullName,
      userPhone: reservation.user.phone,
      userEmail: reservation.user.email,
      companyId: reservation.companyId,
      companyName: reservation.company?.companyName,
      status: reservation.status,
      visitDate: reservation.visitDate.toISOString().split('T')[0],
      visitTime: reservation.visitTime,
      notes: reservation.notes,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    };

    res.json(formattedReservation);
  } catch (error) {
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

// حذف حجز
const deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = dbManager.getPrisma();
    
    await prisma.reservation.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Reservation deleted successfully'
    });
  } catch (error) {
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

// إحصائيات الحجوزات
const getReservationStats = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();
    
    let whereClause = {};
    if (req.user.role === 'company') {
      whereClause.companyId = req.user.id;
    }

    const [total, pending, confirmed, cancelled, completed] = await Promise.all([
      prisma.reservation.count({ where: whereClause }),
      prisma.reservation.count({ where: { ...whereClause, status: 'pending' } }),
      prisma.reservation.count({ where: { ...whereClause, status: 'confirmed' } }),
      prisma.reservation.count({ where: { ...whereClause, status: 'cancelled' } }),
      prisma.reservation.count({ where: { ...whereClause, status: 'completed' } })
    ]);

    res.json({
      total,
      pending,
      confirmed,
      cancelled,
      completed
    });
  } catch (error) {
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
  getReservationStats
};