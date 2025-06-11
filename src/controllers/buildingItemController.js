const prisma = require('../config/prisma');

// Get building items by building ID
const getBuildingItems = async (req, res) => {
    try {
        const { buildingId } = req.params;

        const items = await prisma.buildingItem.findMany({
            where: { buildingId },
            include: {
                building: {
                    select: { id: true, title: true }
                },
                realEstates: {
                    select: { id: true, title: true, price: true }
                },
                _count: {
                    select: { realEstates: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // تنسيق البيانات لتتوافق مع الـ API القديم
        const formattedItems = items.map(item => ({
            ...item,
            realestateCount: item._count.realEstates
        }));

        res.status(200).json(formattedItems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create building item
const createBuildingItem = async (req, res) => {
    try {
        const { name, price, area, type, building_id } = req.body;

        if (!name || !price || !type || !building_id) {
            return res.status(400).json({ 
                message: 'Name, price, type, and building_id are required' 
            });
        }

        // التحقق من صحة النوع
        const validTypes = ['apartment', 'shop', 'villa', 'office'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ 
                message: 'Invalid type. Must be one of: ' + validTypes.join(', ') 
            });
        }

        // التحقق من وجود المبنى
        const building = await prisma.building.findUnique({
            where: { id: building_id }
        });

        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }

        const buildingItem = await prisma.buildingItem.create({
            data: {
                name,
                price,
                area,
                type,
                buildingId: building_id
            },
            include: {
                building: {
                    select: { id: true, title: true }
                }
            }
        });

        res.status(201).json(buildingItem);
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Invalid building ID' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Update building item
const updateBuildingItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No fields provided to update' });
        }

        // إزالة القيم غير المحددة
        Object.keys(updates).forEach(key => {
            if (updates[key] === undefined) {
                delete updates[key];
            }
        });

        // التحقق من صحة النوع إذا تم تمريره
        if (updates.type) {
            const validTypes = ['apartment', 'shop', 'villa', 'office'];
            if (!validTypes.includes(updates.type)) {
                return res.status(400).json({ 
                    message: 'Invalid type. Must be one of: ' + validTypes.join(', ') 
                });
            }
        }

        const buildingItem = await prisma.buildingItem.update({
            where: { id },
            data: updates,
            include: {
                building: {
                    select: { id: true, title: true }
                },
                _count: {
                    select: { realEstates: true }
                }
            }
        });

        res.status(200).json({ 
            message: 'Building item updated successfully',
            buildingItem: {
                ...buildingItem,
                realestateCount: buildingItem._count.realEstates
            }
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Building item not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Delete building item
const deleteBuildingItem = async (req, res) => {
    try {
        const { id } = req.params;

        // التحقق من وجود عقارات مرتبطة
        const itemWithRealEstates = await prisma.buildingItem.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { realEstates: true }
                }
            }
        });

        if (!itemWithRealEstates) {
            return res.status(404).json({ message: 'Building item not found' });
        }

        if (itemWithRealEstates._count.realEstates > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete building item with existing real estates' 
            });
        }

        await prisma.buildingItem.delete({
            where: { id }
        });

        res.status(200).json({ message: 'Building item deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Building item not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Get building item by ID
const getBuildingItemById = async (req, res) => {
    try {
        const { id } = req.params;

        const buildingItem = await prisma.buildingItem.findUnique({
            where: { id },
            include: {
                building: {
                    select: { id: true, title: true, status: true }
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
                    select: { realEstates: true }
                }
            }
        });

        if (!buildingItem) {
            return res.status(404).json({ message: 'Building item not found' });
        }

        const formattedItem = {
            ...buildingItem,
            realestateCount: buildingItem._count.realEstates
        };

        res.status(200).json(formattedItem);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all building items (for admin)
const getAllBuildingItems = async (req, res) => {
    try {
        const { page = 1, limit = 10, buildingId, type } = req.query;
        
        const whereClause = {};
        if (buildingId) whereClause.buildingId = buildingId;
        if (type) whereClause.type = type;

        const items = await prisma.buildingItem.findMany({
            where: whereClause,
            include: {
                building: {
                    select: { id: true, title: true, status: true }
                },
                _count: {
                    select: { realEstates: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        const totalCount = await prisma.buildingItem.count({
            where: whereClause
        });

        const formattedItems = items.map(item => ({
            ...item,
            realestateCount: item._count.realEstates
        }));

        res.status(200).json({
            data: formattedItems,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalCount / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getBuildingItems,
    createBuildingItem,
    updateBuildingItem,
    deleteBuildingItem,
    getBuildingItemById,
    getAllBuildingItems
};