const prisma = require('../config/prisma');

// Get all buildings
const getBuildings = async (req, res) => {
    try {
        // ✅ إضافة فلتر للشركة
        let whereClause = {};
        if (req.user && req.user.role === 'company') {
            whereClause.companyId = req.user.id;
        }

        const buildings = await prisma.building.findMany({
            where: whereClause, // ✅ إضافة الشرط
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

        // إضافة عدد العقارات لكل مبنى
        const buildingsWithCounts = buildings.map(building => ({
            ...building,
            realEstateCount: building._count.realEstates,
            itemsCount: building._count.items,
            // ✅ إضافة معلومات الشركة
            companyName: building.company.companyName,
            companyPhone: building.company.phone,
            companyEmail: building.company.email
        }));

        res.status(200).json(buildingsWithCounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// تعديل createBuilding
const createBuilding = async (req, res) => {
    try {
        const { title, status, location, buildingAge, companyId } = req.body;

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

        // ✅ التحقق من وجود الشركة
        const company = await prisma.user.findUnique({ 
            where: { id: parseInt(finalCompanyId) },
            select: { id: true, role: true, isActive: true }
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
                        phone: true 
                    } 
                }
            }
        });

        res.status(201).json({
            ...building,
            companyName: building.company.companyName
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Get building by ID with items
const getBuildingById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const building = await prisma.building.findUnique({
            where: { id },
            include: {
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

        // تنسيق البيانات
        const formattedBuilding = {
            ...building,
            items: building.items.map(item => ({
                ...item,
                realEstateCount: item._count.realEstates
            })),
            realEstateCount: building._count.realEstates,
            itemsCount: building._count.items
        };

        res.status(200).json(formattedBuilding);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create new building
const getMyBuildings = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();
    
    const buildings = await prisma.building.findMany({
      where: { companyId: req.user.id },
      include: {
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
      itemsCount: building._count.items,
      realEstatesCount: building._count.realEstates
    }));
    
    res.json(formattedBuildings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// الحصول على عقارات الشركة


// Update building
const updateBuilding = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

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

        const building = await prisma.building.update({
            where: { id },
            data: updates
        });

        res.status(200).json({ 
            message: "Building updated successfully", 
            building 
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Building not found" });
        }
        res.status(500).json({ error: error.message });
    }
};

// Delete building
const deleteBuilding = async (req, res) => {
    try {
        const { id } = req.params;

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

        if (buildingWithDeps._count.realEstates > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete building with existing real estates' 
            });
        }

        await prisma.building.delete({
            where: { id }
        });

        res.status(200).json({ message: 'Building deleted successfully' });
    } catch (error) {
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