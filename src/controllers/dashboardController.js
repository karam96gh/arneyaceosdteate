// src/controllers/dashboardController.js
const { dbManager } = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();
    
    // إحصائيات المستخدمين
    const [totalUsers, adminUsers, companyUsers, vipUsers, regularUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.count({ where: { role: 'company' } }),
      prisma.user.count({ where: { role: 'user_vip' } }),
      prisma.user.count({ where: { role: 'user' } }),
      prisma.user.count({ where: { isActive: true } })
    ]);

    // إحصائيات الحجوزات
    let reservationWhereClause = {};
    if (req.user.role === 'company') {
      reservationWhereClause.companyId = req.user.id;
    }

    const [totalReservations, pendingReservations, confirmedReservations, 
           cancelledReservations, completedReservations] = await Promise.all([
      prisma.reservation.count({ where: reservationWhereClause }),
      prisma.reservation.count({ where: { ...reservationWhereClause, status: 'pending' } }),
      prisma.reservation.count({ where: { ...reservationWhereClause, status: 'confirmed' } }),
      prisma.reservation.count({ where: { ...reservationWhereClause, status: 'cancelled' } }),
      prisma.reservation.count({ where: { ...reservationWhereClause, status: 'completed' } })
    ]);

    // إحصائيات العقارات
    let propertyWhereClause = {};
    if (req.user.role === 'company') {
      // إضافة فلتر للشركة إذا لزم الأمر
    }

    const [totalProperties, forSaleProperties, forRentProperties] = await Promise.all([
      prisma.realEstate.count({ where: propertyWhereClause }),
      prisma.realEstate.count({ 
        where: { 
          ...propertyWhereClause,
          mainCategory: { name: { contains: 'بيع' } }
        } 
      }),
      prisma.realEstate.count({ 
        where: { 
          ...propertyWhereClause,
          mainCategory: { name: { contains: 'إيجار' } }
        } 
      })
    ]);

    // إحصائيات العقارات حسب الشركة (للمدراء فقط)
    let propertiesByCompany = {};
    if (req.user.role === 'admin') {
      const companiesWithProperties = await prisma.user.findMany({
        where: { role: 'company' },
        select: {
          id: true,
          companyName: true,
          _count: {
            select: {
              companyReservations: true
            }
          }
        }
      });

      companiesWithProperties.forEach(company => {
        propertiesByCompany[company.id] = company._count.companyReservations;
      });
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
      }
    };

    res.json(dashboardStats);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

module.exports = {
  getDashboardStats
};