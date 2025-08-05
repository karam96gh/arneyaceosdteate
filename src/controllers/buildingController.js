// src/controllers/buildingController.js - FIXED VERSION
const { dbManager } = require('../config/database');

// Get all buildings - FIXED
const getBuildings = async (req, res) => {
    try {
        const prisma = dbManager.getPrisma();
        
        // ✅ إضافة فلتر للشركة
        let whereClause = {};
        if (req.user && req.user.role === 'company') {
            whereClause.companyId = req.user.id;
        }

        const buildings = await prisma.building.findMany({
            where: whereClause, // ✅ إضافة الشرط
            include: {
                // ✅ إضافة معلومات الشركة بشكل صحيح
                company: { 
                    select: { 
                        id: true, 
                        companyName: true, 
                        phone: true,
                        email: true,
                        fullName: true
                    } 
                },
                items: {
                    include: {
                        _count: {
                            select: { realEstates: true }
                        }
                    }
                },
                _count: {
                    select: {
                        items: true,
                        realEstates: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // إضافة عدد العقارات لكل مبنى - FIXED
        const buildingsWithCounts = buildings.map(building => ({
            ...building,
            realEstateCount: building._count.realEstates,
            itemsCount: building._count.items,
            // ✅ إضافة معلومات الشركة بشكل صحيح
            companyName: building.company?.companyName || null,
            companyPhone: building.company?.phone || null,
            companyEmail: building.company?.email || null,
            companyFullName: building.company?.fullName || null
        }));

        res.status(200).json(buildingsWithCounts);
    } catch (error) {
        console.error('Error in getBuildings:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get building by ID with items - FIXED
const getBuildingById = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = dbManager.getPrisma();
        
        const building = await prisma.building.findUnique({
            where: { id },
            include: {
                // ✅ إضافة معلومات الشركة
                company: { 
                    select: { 
                        id: true, 
                        companyName: true, 
                        phone: true,
                        email: true,
                        fullName: true
                    } 
                },
                items: {
                    include: {
                        _count: {
                            select: { realEstates: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                realEstates: {
                    include: {
                        city: { select: { name: true } },
                        neighborhood: { select: { name: true } },
                        finalType: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: {
                        items: true,
                        realEstates: true
                    }
                }
            }
        });

        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }

        // تنسيق البيانات - FIXED
        const formattedBuilding = {
            ...building,
            // ✅ إضافة معلومات الشركة
            companyName: building.company?.companyName || null,
            companyPhone: building.company?.phone || null,
            companyEmail: building.company?.email || null,
            companyFullName: building.company?.fullName || null,
            items: building.items.map(item => ({
                ...item,
                realEstateCount: item._count.realEstates
            })),
            realEstateCount: building._count.realEstates,
            itemsCount: building._count.items
        };

        res.status(200).json(formattedBuilding);
    } catch (error) {
        console.error('Error in getBuildingById:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create new building - FIXED
const createBuilding = async (req, res) => {
    try {
        const { title, status, location, buildingAge, companyId } = req.body;
        const prisma = dbManager.getPrisma();

        // ✅ تحديد الشركة المالكة
        let finalCompanyId = companyId;
        
        if (req.user.role === 'company') {
            finalCompanyId = req.user.id;
        } else if (req.user.role === 'admin' && !finalCompanyId) {
            return res.status(400).json({ 
                message: 'Company ID is required for admin users' 
            });
        }

        if (!title || !status || !finalCompanyId) {
            return res.status(400).json({ 
                message: 'Title, status, and company ID are required' 
            });
        }

        // التحقق من صحة status
        const validStatuses = ['مكتمل', 'قيد_الإنشاء', 'مخطط'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
            });
        }

        // ✅ التحقق من وجود الشركة وصحتها
        const company = await prisma.user.findUnique({ 
            where: { id: parseInt(finalCompanyId) },
            select: { 
                id: true, 
                role: true, 
                isActive: true, 
                companyName: true,
                phone: true,
                email: true,
                fullName: true
            }
        });
        
        if (!company || company.role !== 'COMPANY' || !company.isActive) {
            return res.status(400).json({ 
                message: 'Invalid or inactive company' 
            });
        }

        const building = await prisma.building.create({
            data: {
                title,
                status,
                location: location || '0.0,0.0',
                buildingAge,
                companyId: parseInt(finalCompanyId) // ✅ إضافة companyId
            },
            include: {
                company: { 
                    select: { 
                        id: true, 
                        companyName: true, 
                        phone: true,
                        email: true,
                        fullName: true
                    } 
                }
            }
        });

        // ✅ تنسيق الاستجابة مع معلومات الشركة
        const formattedBuilding = {
            ...building,
            companyName: building.company?.companyName || null,
            companyPhone: building.company?.phone || null,
            companyEmail: building.company?.email || null,
            companyFullName: building.company?.fullName || null
        };

        res.status(201).json(formattedBuilding);
    } catch (error) {
        console.error('Error in createBuilding:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get my buildings - FIXED
const getMyBuildings = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();
    
    const buildings = await prisma.building.findMany({
      where: { companyId: req.user.id },
      include: {
        // ✅ إضافة معلومات الشركة
        company: { 
          select: { 
            id: true, 
            companyName: true, 
            phone: true,
            email: true 
          } 
        },
        items: {
          include: {
            _count: { select: { realEstates: true } }
          }
        },
        _count: {
          select: {
            items: true,
            realEstates: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const formattedBuildings = buildings.map(building => ({
      ...building,
      // ✅ إضافة معلومات الشركة
      companyName: building.company?.companyName || null,
      companyPhone: building.company?.phone || null,
      companyEmail: building.company?.email || null,
      itemsCount: building._count.items,
      realEstatesCount: building._count.realEstates
    }));
    
    res.json(formattedBuildings);
  } catch (error) {
    console.error('Error in getMyBuildings:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update building - FIXED
const updateBuilding = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const prisma = dbManager.getPrisma();

        if (!id) {
            return res.status(400).json({ message: "Building ID is required" });
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No fields provided to update" });
        }

        // إزالة القيم غير المحددة
        Object.keys(updates).forEach(key => {
            if (updates[key] === undefined) {
                delete updates[key];
            }
        });

        // التحقق من صحة status إذا تم تمريره
        if (updates.status) {
            const validStatuses = ['مكتمل', 'قيد_الإنشاء', 'مخطط'];
            if (!validStatuses.includes(updates.status)) {
                return res.status(400).json({ 
                    message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
                });
            }
        }

        // ✅ التحقق من ملكية المبنى قبل التحديث
        if (req.user.role === 'company') {
            const existingBuilding = await prisma.building.findUnique({
                where: { id },
                select: { companyId: true }
            });

            if (!existingBuilding) {
                return res.status(404).json({ message: "Building not found" });
            }

            if (existingBuilding.companyId !== req.user.id) {
                return res.status(403).json({ message: "Access denied to this building" });
            }
        }

        const building = await prisma.building.update({
            where: { id },
            data: updates,
            include: {
                company: { 
                    select: { 
                        id: true, 
                        companyName: true, 
                        phone: true 
                    } 
                }
            }
        });

        // ✅ تنسيق الاستجابة
        const formattedBuilding = {
            ...building,
            companyName: building.company?.companyName || null,
            companyPhone: building.company?.phone || null
        };

        res.status(200).json({ 
            message: "Building updated successfully", 
            building: formattedBuilding 
        });
    } catch (error) {
        console.error('Error in updateBuilding:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Building not found" });
        }
        res.status(500).json({ error: error.message });
    }
};

// Delete building - FIXED
const deleteBuilding = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = dbManager.getPrisma();

        // التحقق من وجود عقارات مرتبطة
        const buildingWithDeps = await prisma.building.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        items: true,
                        realEstates: true
                    }
                }
            }
        });

        if (!buildingWithDeps) {
            return res.status(404).json({ message: 'Building not found' });
        }

        // ✅ التحقق من ملكية المبنى للشركة
        if (req.user.role === 'company' && buildingWithDeps.companyId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied to this building' });
        }

        if (buildingWithDeps._count.realEstates > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete building with existing real estates' 
            });
        }

        if (buildingWithDeps._count.items > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete building with existing items' 
            });
        }

        await prisma.building.delete({
            where: { id }
        });

        res.status(200).json({ message: 'Building deleted successfully' });
    } catch (error) {
        console.error('Error in deleteBuilding:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Building not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getBuildings,
    getBuildingById,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    getMyBuildings
};