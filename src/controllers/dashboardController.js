// src/controllers/dashboardController.js - FIXED VERSION
const { dbManager } = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();
    
    // إحصائيات المستخدمين - FIXED
    const [totalUsers, adminUsers, companyUsers, vipUsers, regularUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }), // ✅ استخدام enum value
      prisma.user.count({ where: { role: 'COMPANY' } }), // ✅ استخدام enum value
      prisma.user.count({ where: { role: 'USER_VIP' } }), // ✅ استخدام enum value
      prisma.user.count({ where: { role: 'USER' } }), // ✅ استخدام enum value
      prisma.user.count({ where: { isActive: true } })
    ]);

    // ✅ إحصائيات الحجوزات - إصلاح فلتر الشركة
    let reservationWhereClause = {};
    if (req.user.role === 'company') {
      reservationWhereClause.companyId = req.user.id;
    }

    const [totalReservations, pendingReservations, confirmedReservations, 
           cancelledReservations, completedReservations] = await Promise.all([
      prisma.reservation.count({ where: reservationWhereClause }),
      prisma.reservation.count({ where: { ...reservationWhereClause, status: 'PENDING' } }), // ✅ enum value
      prisma.reservation.count({ where: { ...reservationWhereClause, status: 'CONFIRMED' } }), // ✅ enum value
      prisma.reservation.count({ where: { ...reservationWhereClause, status: 'CANCELLED' } }), // ✅ enum value
      prisma.reservation.count({ where: { ...reservationWhereClause, status: 'COMPLETED' } }) // ✅ enum value
    ]);

    // ✅ إحصائيات العقارات - إصلاح فلتر الشركة
    let propertyWhereClause = {};
    if (req.user.role === 'company') {
      propertyWhereClause.companyId = req.user.id; // ✅ إضافة فلتر الشركة للعقارات
    }

    const [totalProperties, forSaleProperties, forRentProperties] = await Promise.all([
      prisma.realEstate.count({ where: propertyWhereClause }),
      // ✅ إصلاح البحث في فئة البيع
      prisma.realEstate.count({ 
        where: { 
          ...propertyWhereClause,
          mainCategory: { 
            name: { 
              contains: 'بيع' 
            } 
          }
        } 
      }),
      // ✅ إصلاح البحث في فئة الإيجار
      prisma.realEstate.count({ 
        where: { 
          ...propertyWhereClause,
          mainCategory: { 
            name: { 
              contains: 'إيجار' 
            } 
          }
        } 
      })
    ]);

    // ✅ إحصائيات المباني - إضافة إحصائيات المباني
    let buildingWhereClause = {};
    if (req.user.role === 'company') {
      buildingWhereClause.companyId = req.user.id;
    }

    const [totalBuildings, completedBuildings, underConstructionBuildings, plannedBuildings] = await Promise.all([
      prisma.building.count({ where: buildingWhereClause }),
      prisma.building.count({ where: { ...buildingWhereClause, status: 'COMPLETED' } }),
      prisma.building.count({ where: { ...buildingWhereClause, status: 'UNDER_CONSTRUCTION' } }),
      prisma.building.count({ where: { ...buildingWhereClause, status: 'PLANNED' } })
    ]);

    // ✅ إحصائيات العقارات حسب الشركة (للمدراء فقط) - إصلاح الاستعلام
    let propertiesByCompany = {};
    let buildingsByCompany = {};
    
    if (req.user.role === 'admin') {
      // إحصائيات العقارات حسب الشركة
      const companiesWithProperties = await prisma.user.findMany({
        where: { role: 'COMPANY' },
        select: {
          id: true,
          companyName: true,
          _count: {
            select: {
              companyRealEstates: true, // ✅ استخدام العلاقة الصحيحة
              companyBuildings: true,   // ✅ إضافة إحصائيات المباني
              companyReservations: true // للحجوزات
            }
          }
        }
      });

      companiesWithProperties.forEach(company => {
        propertiesByCompany[company.id] = {
          companyName: company.companyName,
          realEstatesCount: company._count.companyRealEstates,
          buildingsCount: company._count.companyBuildings,
          reservationsCount: company._count.companyReservations
        };
      });

      // ✅ إحصائيات مفصلة للعقارات حسب النوع لكل شركة
      const detailedCompanyStats = await prisma.realEstate.groupBy({
        by: ['companyId'],
        where: {
          companyId: { not: null }
        },
        _count: {
          id: true
        }
      });

      // ربط النتائج بأسماء الشركات
      for (const stat of detailedCompanyStats) {
        if (propertiesByCompany[stat.companyId]) {
          propertiesByCompany[stat.companyId].totalRealEstates = stat._count.id;
        }
      }
    }

    // ✅ إحصائيات إضافية للشركة الحالية
    let companySpecificStats = {};
    if (req.user.role === 'company') {
      // أحدث العقارات للشركة
      const recentProperties = await prisma.realEstate.findMany({
        where: { companyId: req.user.id },
        select: {
          id: true,
          title: true,
          price: true,
          createdAt: true,
          city: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      // أحدث الحجوزات للشركة
      const recentReservations = await prisma.reservation.findMany({
        where: { companyId: req.user.id },
        select: {
          id: true,
          status: true,
          visitDate: true,
          user: { select: { fullName: true } },
          property: { select: { title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      companySpecificStats = {
        recentProperties: recentProperties.map(prop => ({
          ...prop,
          status: prop.status?.toLowerCase() // تحويل للعرض
        })),
        recentReservations: recentReservations.map(res => ({
          ...res,
          status: res.status.toLowerCase() // ✅ تحويل للعرض
        }))
      };
    }

    const dashboardStats = {
      users: {
        total: totalUsers,
        admin: adminUsers,
        company: companyUsers,
        user_vip: vipUsers,
        user: regularUsers,
        active: activeUsers
      },
      reservations: {
        total: totalReservations,
        pending: pendingReservations,
        confirmed: confirmedReservations,
        cancelled: cancelledReservations,
        completed: completedReservations
      },
      properties: {
        total: totalProperties,
        forSale: forSaleProperties,
        forRent: forRentProperties,
        byCompany: propertiesByCompany
      },
      // ✅ إضافة إحصائيات المباني
      buildings: {
        total: totalBuildings,
        completed: completedBuildings,
        underConstruction: underConstructionBuildings,
        planned: plannedBuildings,
        byCompany: buildingsByCompany
      },
      // ✅ إضافة الإحصائيات الخاصة بالشركة
      ...(req.user.role === 'company' && { companyStats: companySpecificStats })
    };

    res.json(dashboardStats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

module.exports = {
  getDashboardStats
};