// src/controllers/buildingItemController.js - FIXED VERSION
const { dbManager } = require('../config/database');

// Get building items by building ID - FIXED
const getBuildingItems = async (req, res) => {
    try {
        const { buildingId } = req.params;
        const prisma = dbManager.getPrisma();

        const items = await prisma.buildingItem.findMany({
            where: { buildingId },
            include: {
                building: {
                    select: { id: true, title: true, companyId: true }
                },
                // ✅ إضافة معلومات الشركة
                company: { 
                    select: { 
                        id: true, 
                        companyName: true, 
                        phone: true,
                        email: true 
                    } 
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

        // تنسيق البيانات لتتوافق مع الـ API القديم - FIXED
        const formattedItems = items.map(item => ({
            ...item,
            realestateCount: item._count.realEstates,
            // ✅ إضافة معلومات الشركة
            companyName: item.company?.companyName || null,
            companyPhone: item.company?.phone || null
        }));

        res.status(200).json(formattedItems);
    } catch (error) {
        console.error('Error in getBuildingItems:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create building item - FIXED
const createBuildingItem = async (req, res) => {
    try {
        const { name, price, area, type, building_id, companyId } = req.body;
        const prisma = dbManager.getPrisma();

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

        // التحقق من وجود المبنى وملكيته
        const building = await prisma.building.findUnique({
            where: { id: building_id },
            select: { id: true, companyId: true }
        });

        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }

        // ✅ تحديد الشركة المالكة
        let finalCompanyId = companyId;
        
        if (req.user.role === 'company') {
            // للشركة: استخدم ID الخاص بها وتأكد من ملكية المبنى
            finalCompanyId = req.user.id;
            if (building.companyId !== req.user.id) {
                return res.status(403).json({ message: 'Access denied to this building' });
            }
        } else if (req.user.role === 'admin') {
            // للمدير: يمكن تحديد الشركة أو استخدام شركة المبنى
            finalCompanyId = finalCompanyId || building.companyId;
        }

        if (!finalCompanyId) {
            return res.status(400).json({ message: 'Company ID is required' });
        }

        // ✅ التحقق من صحة الشركة
        const company = await prisma.user.findUnique({ 
            where: { id: parseInt(finalCompanyId) },
            select: { 
                id: true, 
                role: true, 
                isActive: true, 
                companyName: true,
                phone: true 
            }
        });
        
        if (!company || company.role !== 'COMPANY' || !company.isActive) {
            return res.status(400).json({ 
                message: 'Invalid or inactive company' 
            });
        }

        const buildingItem = await prisma.buildingItem.create({
            data: {
                name,
                price,
                area,
                type,
                buildingId: building_id,
                companyId: parseInt(finalCompanyId) // ✅ إضافة companyId
            },
            include: {
                building: {
                    select: { id: true, title: true }
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

        // ✅ تنسيق الاستجابة
        const formattedItem = {
            ...buildingItem,
            companyName: buildingItem.company?.companyName || null,
            companyPhone: buildingItem.company?.phone || null
        };

        res.status(201).json(formattedItem);
    } catch (error) {
        console.error('Error in createBuildingItem:', error);
        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Invalid building ID or company ID' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Update building item - FIXED
const updateBuildingItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const prisma = dbManager.getPrisma();

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

        // ✅ التحقق من ملكية العنصر للشركة
        if (req.user.role === 'company') {
            const existingItem = await prisma.buildingItem.findUnique({
                where: { id },
                select: { companyId: true }
            });

            if (!existingItem) {
                return res.status(404).json({ message: 'Building item not found' });
            }

            if (existingItem.companyId !== req.user.id) {
                return res.status(403).json({ message: 'Access denied to this building item' });
            }
        }

        const buildingItem = await prisma.buildingItem.update({
            where: { id },
            data: updates,
            include: {
                building: {
                    select: { id: true, title: true }
                },
                company: { 
                    select: { 
                        id: true, 
                        companyName: true, 
                        phone: true 
                    } 
                },
                _count: {
                    select: { realEstates: true }
                }
            }
        });

        // ✅ تنسيق الاستجابة
        const formattedItem = {
            ...buildingItem,
            realestateCount: buildingItem._count.realEstates,
            companyName: buildingItem.company?.companyName || null,
            companyPhone: buildingItem.company?.phone || null
        };

        res.status(200).json({ 
            message: 'Building item updated successfully',
            buildingItem: formattedItem
        });
    } catch (error) {
        console.error('Error in updateBuildingItem:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Building item not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Delete building item - FIXED
const deleteBuildingItem = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = dbManager.getPrisma();

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

        // ✅ التحقق من ملكية العنصر للشركة
        if (req.user.role === 'company' && itemWithRealEstates.companyId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied to this building item' });
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
        console.error('Error in deleteBuildingItem:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Building item not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Get building item by ID - FIXED
const getBuildingItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = dbManager.getPrisma();

        const buildingItem = await prisma.buildingItem.findUnique({
            where: { id },
            include: {
                building: {
                    select: { id: true, title: true, status: true }
                },
                company: { 
                    select: { 
                        id: true, 
                        companyName: true, 
                        phone: true,
                        email: true 
                    } 
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
            realestateCount: buildingItem._count.realEstates,
            companyName: buildingItem.company?.companyName || null,
            companyPhone: buildingItem.company?.phone || null,
            companyEmail: buildingItem.company?.email || null
        };

        res.status(200).json(formattedItem);
    } catch (error) {
        console.error('Error in getBuildingItemById:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get all building items (for admin) - FIXED
const getAllBuildingItems = async (req, res) => {
    try {
        const { page = 1, limit = 10000, buildingId, type } = req.query;
        const prisma = dbManager.getPrisma();
        
        const whereClause = {};
        if (buildingId) whereClause.buildingId = buildingId;
        if (type) whereClause.type = type;

        // ✅ إضافة فلتر للشركة
        if (req.user && req.user.role === 'company') {
            whereClause.companyId = req.user.id;
        }

        const items = await prisma.buildingItem.findMany({
            where: whereClause,
            include: {
                building: {
                    select: { id: true, title: true, status: true }
                },
                company: { 
                    select: { 
                        id: true, 
                        companyName: true, 
                        phone: true 
                    } 
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
            realestateCount: item._count.realEstates,
            companyName: item.company?.companyName || null,
            companyPhone: item.company?.phone || null
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
        console.error('Error in getAllBuildingItems:', error);
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