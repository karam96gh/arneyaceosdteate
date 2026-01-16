// src/controllers/offersController.js
const { dbManager } = require('../config/database');
const { buildGeneralFileUrl } = require('../config/upload');

// إنشاء عرض جديد
const createOffer = async (req, res) => {
  try {
    console.log('=== CREATE OFFER START ===');
    console.log('User:', req.user?.id, req.user?.role, req.user?.username);

    const { propertyId, offerAmount, visitDate, visitTime, notes } = req.body;

    // الحصول على اسم ملف صورة الهوية إذا تم رفعها
    const idImage = req.file ? req.file.filename : null;
    console.log('ID Image uploaded:', idImage);

    // التحقق من البيانات المطلوبة
    if (!propertyId || !offerAmount || !visitDate || !visitTime) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Property ID, offer amount, visit date, and visit time are required' }
      });
    }

    // التحقق من أن مبلغ العرض رقم موجب
    if (isNaN(offerAmount) || parseInt(offerAmount) <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Offer amount must be a positive number' }
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

    // الحصول على معلومات العقار والشركة المالكة
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

    // تحديد الشركة المالكة
    let companyId = property.companyId;

    console.log('Final companyId:', companyId);

    // فحص إذا كان المستخدم لديه عرض معلق للنفس العقار
    const userPendingOffer = await prisma.offer.findFirst({
      where: {
        propertyId: parseInt(propertyId),
        userId: req.user.id,
        status: { in: ['PENDING', 'ACCEPTED'] }
      }
    });

    if (userPendingOffer) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EXISTING_OFFER',
          message: 'You already have a pending or accepted offer for this property'
        }
      });
    }

    // إنشاء العرض
    const offer = await prisma.offer.create({
      data: {
        propertyId: parseInt(propertyId),
        userId: req.user.id,
        companyId: companyId,
        offerAmount: parseInt(offerAmount),
        visitDate: visitDateTime,
        visitTime,
        notes,
        idImage,
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

    console.log('✅ Offer created successfully:', offer.id);

    // تنسيق الاستجابة
    const formattedOffer = {
      id: offer.id,
      propertyId: offer.propertyId,
      propertyTitle: offer.property.title,
      propertyPrice: offer.property.price,
      propertyImage: offer.property.coverImage,
      propertyLocation: `${offer.property.city.name}, ${offer.property.neighborhood.name}`,
      userId: offer.userId,
      userName: offer.user.fullName,
      userPhone: offer.user.phone,
      userEmail: offer.user.email,
      companyId: offer.companyId,
      companyName: offer.company?.companyName || 'No company assigned',
      companyPhone: offer.company?.phone,
      offerAmount: offer.offerAmount,
      status: offer.status.toLowerCase(),
      visitDate: offer.visitDate.toISOString().split('T')[0],
      visitTime: offer.visitTime,
      notes: offer.notes,
      idImage: offer.idImage ? buildGeneralFileUrl(offer.idImage) : null,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt
    };

    res.status(201).json({
      success: true,
      data: formattedOffer,
      message: 'Offer created successfully'
    });

  } catch (error) {
    console.error('❌ Create offer error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// الحصول على عروض المستخدم الحالي
const getUserOffers = async (req, res) => {
  try {
    console.log('=== GET USER OFFERS ===');
    console.log('User ID:', req.user?.id);
    console.log('User Role:', req.user?.role);

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'User authentication required' }
      });
    }

    const prisma = dbManager.getPrisma();

    const offers = await prisma.offer.findMany({
      where: { userId: req.user.id },
      include: {
        property: {
          include: {
            city: { select: { name: true } },
            neighborhood: { select: { name: true } },
            finalType: { select: { name: true } },
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

    console.log(`Found ${offers.length} offers for user ${req.user.id}`);

    const formattedOffers = offers.map(offer => {
      const propertyLocation = offer.property.city && offer.property.neighborhood
        ? `${offer.property.city.name}, ${offer.property.neighborhood.name}`
        : 'Location not specified';

      return {
        id: offer.id,
        propertyId: offer.propertyId,
        propertyTitle: offer.property.title,
        propertyPrice: offer.property.price,
        propertyImage: offer.property.coverImage,
        propertyLocation: propertyLocation,
        propertyType: offer.property.finalType?.name || offer.property.mainCategory?.name || 'Unknown',
        companyId: offer.companyId,
        companyName: offer.company?.companyName || 'No company assigned',
        companyPhone: offer.company?.phone,
        companyEmail: offer.company?.email,
        offerAmount: offer.offerAmount,
        status: offer.status.toLowerCase(),
        visitDate: offer.visitDate instanceof Date
          ? offer.visitDate.toISOString().split('T')[0]
          : offer.visitDate,
        visitTime: offer.visitTime,
        notes: offer.notes,
        idImage: offer.idImage ? buildGeneralFileUrl(offer.idImage) : null,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        canCancel: offer.status === 'PENDING' && new Date(offer.visitDate) > new Date(),
        isUpcoming: new Date(offer.visitDate) > new Date()
      };
    });

    // إضافة إحصائيات للمستخدم
    const stats = {
      total: formattedOffers.length,
      pending: formattedOffers.filter(o => o.status === 'pending').length,
      accepted: formattedOffers.filter(o => o.status === 'accepted').length,
      rejected: formattedOffers.filter(o => o.status === 'rejected').length,
      cancelled: formattedOffers.filter(o => o.status === 'cancelled').length,
      upcoming: formattedOffers.filter(o => o.isUpcoming).length
    };

    res.json({
      success: true,
      data: {
        offers: formattedOffers,
        stats: stats
      },
      message: `Found ${formattedOffers.length} offers`
    });

  } catch (error) {
    console.error('❌ Get user offers error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// الحصول على العروض (للمدراء والشركات)
const getOffers = async (req, res) => {
  try {
    const { status, propertyId, userId, page = 1, limit = 10 } = req.query;
    const prisma = dbManager.getPrisma();

    let whereClause = {};

    // تطبيق الفلاتر حسب الدور
    if (req.user.role === 'company') {
      whereClause.OR = [
        { companyId: req.user.id },
        {
          property: {
            companyId: req.user.id
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

    console.log('Where clause for getOffers:', JSON.stringify(whereClause, null, 2));

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
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
      prisma.offer.count({ where: whereClause })
    ]);

    console.log(`Found ${offers.length} offers for ${req.user.role} user ${req.user.id}`);

    const formattedOffers = offers.map(offer => ({
      id: offer.id,
      propertyId: offer.propertyId,
      propertyTitle: offer.property.title,
      propertyPrice: offer.property.price,
      propertyImage: offer.property.coverImage,
      propertyLocation: offer.property.city && offer.property.neighborhood
        ? `${offer.property.city.name}, ${offer.property.neighborhood.name}`
        : undefined,
      userId: offer.userId,
      userName: offer.user.fullName,
      userPhone: offer.user.phone,
      userEmail: offer.user.email,
      companyId: offer.companyId,
      companyName: offer.company?.companyName || 'No company assigned',
      companyPhone: offer.company?.phone,
      offerAmount: offer.offerAmount,
      status: offer.status.toLowerCase(),
      visitDate: offer.visitDate instanceof Date
        ? offer.visitDate.toISOString().split('T')[0]
        : offer.visitDate,
      visitTime: offer.visitTime,
      notes: offer.notes,
      idImage: offer.idImage ? buildGeneralFileUrl(offer.idImage) : null,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt
    }));

    res.json({
      success: true,
      data: {
        offers: formattedOffers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      },
      message: `Found ${total} total offers`
    });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// تحديث عرض
const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, offerAmount, visitDate, visitTime, notes } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Valid offer ID is required' }
      });
    }

    const prisma = dbManager.getPrisma();

    // التحقق من وجود العرض وصلاحية التحديث
    const existingOffer = await prisma.offer.findUnique({
      where: { id: parseInt(id) },
      include: {
        property: { select: { companyId: true, title: true } },
        user: { select: { fullName: true } }
      }
    });

    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        error: { code: 'OFFER_NOT_FOUND', message: 'Offer not found' }
      });
    }

    // فحص الصلاحيات
    const canUpdate = req.user.role === 'admin' ||
                     (req.user.role === 'company' && (
                       existingOffer.companyId === req.user.id ||
                       existingOffer.property.companyId === req.user.id
                     )) ||
                     (req.user.id === existingOffer.userId);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'You do not have permission to update this offer' }
      });
    }

    const updateData = {};

    // تحديث الحالة
    if (status) {
      const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled'];
      if (!validStatuses.includes(status.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Invalid status value' }
        });
      }
      updateData.status = status.toUpperCase();
    }

    // تحديث مبلغ العرض
    if (offerAmount) {
      if (isNaN(offerAmount) || parseInt(offerAmount) <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_AMOUNT', message: 'Offer amount must be a positive number' }
        });
      }
      updateData.offerAmount = parseInt(offerAmount);
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

    const offer = await prisma.offer.update({
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
    const formattedOffer = {
      id: offer.id,
      propertyId: offer.propertyId,
      propertyTitle: offer.property.title,
      propertyPrice: offer.property.price,
      propertyImage: offer.property.coverImage,
      propertyLocation: `${offer.property.city.name}, ${offer.property.neighborhood.name}`,
      userId: offer.userId,
      userName: offer.user.fullName,
      userPhone: offer.user.phone,
      userEmail: offer.user.email,
      companyId: offer.companyId,
      companyName: offer.company?.companyName || 'No company assigned',
      companyPhone: offer.company?.phone,
      offerAmount: offer.offerAmount,
      status: offer.status.toLowerCase(),
      visitDate: offer.visitDate instanceof Date
        ? offer.visitDate.toISOString().split('T')[0]
        : offer.visitDate,
      visitTime: offer.visitTime,
      notes: offer.notes,
      idImage: offer.idImage ? buildGeneralFileUrl(offer.idImage) : null,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt
    };

    res.json({
      success: true,
      data: formattedOffer,
      message: 'Offer updated successfully'
    });
  } catch (error) {
    console.error('Update offer error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'OFFER_NOT_FOUND', message: 'Offer not found' }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// حذف عرض
const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Valid offer ID is required' }
      });
    }

    const prisma = dbManager.getPrisma();

    // التحقق من وجود العرض والصلاحيات
    const existingOffer = await prisma.offer.findUnique({
      where: { id: parseInt(id) },
      include: {
        property: { select: { companyId: true } }
      }
    });

    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        error: { code: 'OFFER_NOT_FOUND', message: 'Offer not found' }
      });
    }

    // فحص الصلاحيات
    const canDelete = req.user.role === 'admin' ||
                     (req.user.role === 'company' && (
                       existingOffer.companyId === req.user.id ||
                       existingOffer.property.companyId === req.user.id
                     )) ||
                     (req.user.id === existingOffer.userId);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'You do not have permission to delete this offer' }
      });
    }

    await prisma.offer.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    console.error('Delete offer error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'OFFER_NOT_FOUND', message: 'Offer not found' }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// إحصائيات العروض
const getOfferStats = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();

    let whereClause = {};
    if (req.user.role === 'company') {
      whereClause.OR = [
        { companyId: req.user.id },
        { property: { companyId: req.user.id } }
      ];
    }

    const [total, pending, accepted, rejected, cancelled] = await Promise.all([
      prisma.offer.count({ where: whereClause }),
      prisma.offer.count({ where: { ...whereClause, status: 'PENDING' } }),
      prisma.offer.count({ where: { ...whereClause, status: 'ACCEPTED' } }),
      prisma.offer.count({ where: { ...whereClause, status: 'REJECTED' } }),
      prisma.offer.count({ where: { ...whereClause, status: 'CANCELLED' } })
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        accepted,
        rejected,
        cancelled
      }
    });
  } catch (error) {
    console.error('Get offer stats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// الحصول على العروض القادمة
const getUpcomingOffers = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();

    let whereClause = {
      visitDate: { gte: new Date() },
      status: { in: ['PENDING', 'ACCEPTED'] }
    };

    if (req.user.role === 'user' || req.user.role === 'user_vip') {
      whereClause.userId = req.user.id;
    } else if (req.user.role === 'company') {
      whereClause.OR = [
        { companyId: req.user.id },
        { property: { companyId: req.user.id } }
      ];
    }

    const offers = await prisma.offer.findMany({
      where: whereClause,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            price: true,
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

    const formattedOffers = offers.map(offer => ({
      id: offer.id,
      propertyTitle: offer.property.title,
      propertyImage: offer.property.coverImage,
      propertyPrice: offer.property.price,
      propertyLocation: `${offer.property.city.name}, ${offer.property.neighborhood.name}`,
      userName: offer.user.fullName,
      userPhone: offer.user.phone,
      offerAmount: offer.offerAmount,
      status: offer.status.toLowerCase(),
      visitDate: offer.visitDate.toISOString().split('T')[0],
      visitTime: offer.visitTime,
      daysUntilVisit: Math.ceil((offer.visitDate - new Date()) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      success: true,
      data: formattedOffers,
      message: `Found ${formattedOffers.length} upcoming offers`
    });
  } catch (error) {
    console.error('Get upcoming offers error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

module.exports = {
  createOffer,
  getOffers,
  getUserOffers,
  updateOffer,
  deleteOffer,
  getOfferStats,
  getUpcomingOffers
};
