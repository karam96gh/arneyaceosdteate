const prisma = require('../config/prisma');

// Get all buildings
const getBuildings = async (req, res) => {
    try {
        const buildings = await prisma.building.findMany({
            include: {
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
            itemsCount: building._count.items
        }));

        res.status(200).json(buildingsWithCounts);
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
const createBuilding = async (req, res) => {
    try {
        const { title, status, location, buildingAge } = req.body;

        if (!title || !status) {
            return res.status(400).json({ 
                message: 'Title and status are required' 
            });
        }

        // التحقق من صحة status
        const validStatuses = ['مكتمل', 'قيد_الإنشاء', 'مخطط'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
            });
        }

        const building = await prisma.building.create({
            data: {
                title,
                status,
                location: location || '0.0,0.0',
                buildingAge
            }
        });

        res.status(201).json(building);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

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
    deleteBuilding
};