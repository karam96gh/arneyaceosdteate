// src/controllers/buildingController.js - MODIFIED VERSION مع دمج items و realEstates
const { dbManager } = require('../config/database');
const { buildRealEstateFileUrl } = require('../config/upload');

// ✅ إضافة mapping للحالات
const STATUS_MAPPING = {
    // من القيم المرسلة -> إلى قيم Prisma Enum
    'مكتمل': 'COMPLETED',
    'قيد_الإنشاء': 'UNDER_CONSTRUCTION',
    'مخطط': 'PLANNED'
};

// ✅ العكس للقراءة من قاعدة البيانات
const REVERSE_STATUS_MAPPING = {
    'COMPLETED': 'مكتمل',
    'UNDER_CONSTRUCTION': 'قيد_الإنشاء',
    'PLANNED': 'مخطط'
};

// ✅ دالة مساعدة للتحويل
const convertBuildingStatus = (status, toDatabase = true) => {
    if (toDatabase) {
        return STATUS_MAPPING[status] || status;
    } else {
        return REVERSE_STATUS_MAPPING[status] || status;
    }
};

// ✅ دالة تحويل العقار إلى شكل "item"
const formatRealEstateAsItem = (realEstate) => {
    return {
        id: realEstate.id,
        name: realEstate.title,                    // العنوان كاسم العنصر
        price: realEstate.price.toString(),        // السعر كـ string
        area: realEstate.properties?.area?.value || null,  // المساحة من الخصائص
        type: determineItemType(realEstate.finalType?.name), // تحديد النوع
        buildingId: realEstate.buildingId,
        companyId: realEstate.companyId,
        coverImage: buildRealEstateFileUrl(realEstate.coverImage),
        description: realEstate.description,
        cityName: realEstate.city?.name,
        neighborhoodName: realEstate.neighborhood?.name,
        finalTypeName: realEstate.finalType?.name,
        paymentMethod: realEstate.paymentMethod,
        location: realEstate.location,
        viewTime: realEstate.viewTime,
        advertiserType: realEstate.advertiserType || "company",
        advertiserName: realEstate.advertiserName || realEstate.company?.companyName,
        advertiserPhone: realEstate.advertiserPhone || realEstate.company?.phone,
        files: realEstate.files?.map(f => buildRealEstateFileUrl(f.name)) || [],
        properties: formatProperties(realEstate.propertyValues || []),
        createdAt: realEstate.createdAt,
        updatedAt: realEstate.updatedAt
    };
};

// ✅ دالة تحديد نوع العنصر من نوع العقار
const determineItemType = (finalTypeName) => {
    if (!finalTypeName) return 'apartment';
    
    const typeName = finalTypeName.toLowerCase();
    
    if (typeName.includes('شقة') || typeName.includes('apartment')) return 'apartment';
    if (typeName.includes('محل') || typeName.includes('shop') || typeName.includes('متجر')) return 'shop';
    if (typeName.includes('فيلا') || typeName.includes('villa')) return 'villa';
    if (typeName.includes('مكتب') || typeName.includes('office')) return 'office';
    
    return 'apartment'; // افتراضي
};

// ✅ دالة تنسيق الخصائص
const formatProperties = (propertyValues) => {
    const properties = {};
    propertyValues.forEach(pv => {
        if (pv.property) {
            properties[pv.property.propertyKey] = {
                value: pv.value,
                property: {
                    id: pv.property.id,
                    propertyKey: pv.property.propertyKey,
                    propertyName: pv.property.propertyName,
                    dataType: pv.property.dataType,
                    unit: pv.property.unit
                }
            };
        }
    });
    return properties;
};

// ✅ دالة مساعدة لتحويل البيانات المقروءة
const formatBuildingForResponse = (building) => {
    return {
        ...building,
        status: convertBuildingStatus(building.status, false), // تحويل للعرض
        // ✅ إضافة معلومات الشركة
        companyName: building.company?.companyName || null,
        companyPhone: building.company?.phone || null,
        companyEmail: building.company?.email || null,
        companyFullName: building.company?.fullName || null
    };
};

// Get all buildings - MODIFIED
const getBuildings = async (req, res) => {
    try {
        const prisma = dbManager.getPrisma();
        
        // ✅ إضافة فلتر للشركة
        let whereClause = {};
        if (req.user && req.user.role === 'company') {
            whereClause.companyId = req.user.id;
        }

        const buildings = await prisma.building.findMany({
            where: whereClause,
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
                // ✅ استبدال items بـ realEstates مع تفاصيل أساسية
                realEstates: {
                    include: {
                        city: { select: { name: true } },
                        neighborhood: { select: { name: true } },
                        finalType: { select: { name: true } },
                        company: { 
                            select: { 
                                companyName: true, 
                                phone: true 
                            } 
                        },
                        files: { select: { name: true } },
                        propertyValues: {
                            include: {
                                property: {
                                    select: {
                                        propertyKey: true,
                                        propertyName: true,
                                        dataType: true,
                                        unit: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: {
                        realEstates: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // ✅ تحويل البيانات للعرض مع دمج المفاهيم
        const buildingsWithItems = buildings.map(building => {
            const formattedBuilding = formatBuildingForResponse(building);
            
            return {
                ...formattedBuilding,
                // ✅ تحويل realEstates إلى items
                items: building.realEstates.map(realEstate => formatRealEstateAsItem(realEstate)),
                // ✅ الإحصائيات المبسطة
                realEstateCount: building._count.realEstates,
                itemsCount: building._count.realEstates  // نفس الرقم
            };
        });

        res.status(200).json(buildingsWithItems);
    } catch (error) {
        console.error('Error in getBuildings:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get building by ID with items - MODIFIED
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
                // ✅ استبدال items بـ realEstates مع تفاصيل كاملة
                realEstates: {
                    include: {
                        city: { select: { name: true } },
                        neighborhood: { select: { name: true } },
                        finalType: { select: { name: true } },
                        mainCategory: { select: { name: true } },
                        subCategory: { select: { name: true } },
                        company: { 
                            select: { 
                                companyName: true, 
                                phone: true,
                                email: true
                            } 
                        },
                        files: { select: { name: true } },
                        propertyValues: {
                            include: {
                                property: {
                                    select: {
                                        id: true,
                                        propertyKey: true,
                                        propertyName: true,
                                        dataType: true,
                                        unit: true,
                                        groupName: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: {
                        realEstates: true
                    }
                }
            }
        });

        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }

        // ✅ تنسيق البيانات مع التحويل الكامل
        const formattedBuilding = {
            ...formatBuildingForResponse(building),
            // ✅ تحويل realEstates إلى items مع تفاصيل كاملة
            items: building.realEstates.map(realEstate => formatRealEstateAsItem(realEstate)),
            // ✅ الإحصائيات المبسطة
            realEstateCount: building._count.realEstates,
            itemsCount: building._count.realEstates  // نفس الرقم
        };

        res.status(200).json(formattedBuilding);
    } catch (error) {
        console.error('Error in getBuildingById:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create new building - لا يحتاج تعديل
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

        // ✅ التحقق من صحة status مع القيم العربية
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

        // ✅ تحويل status إلى enum value قبل الحفظ
        const building = await prisma.building.create({
            data: {
                title,
                status: convertBuildingStatus(status, true), // ✅ تحويل للقاعدة
                location: location || '0.0,0.0',
                buildingAge,
                companyId: parseInt(finalCompanyId)
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

        // ✅ تنسيق الاستجابة مع التحويل
        const formattedBuilding = formatBuildingForResponse(building);

        res.status(201).json(formattedBuilding);
    } catch (error) {
        console.error('Error in createBuilding:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get my buildings - MODIFIED
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
                // ✅ استبدال items بـ realEstates
                realEstates: {
                    include: {
                        city: { select: { name: true } },
                        neighborhood: { select: { name: true } },
                        finalType: { select: { name: true } },
                        files: { select: { name: true } },
                        propertyValues: {
                            include: {
                                property: {
                                    select: {
                                        propertyKey: true,
                                        propertyName: true,
                                        dataType: true,
                                        unit: true
                                    }
                                }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        realEstates: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        // ✅ تحويل البيانات للعرض مع دمج المفاهيم
        const formattedBuildings = buildings.map(building => ({
            ...formatBuildingForResponse(building),
            // ✅ تحويل realEstates إلى items
            items: building.realEstates.map(realEstate => formatRealEstateAsItem(realEstate)),
            itemsCount: building._count.realEstates,
            realEstatesCount: building._count.realEstates
        }));
        
        res.json(formattedBuildings);
    } catch (error) {
        console.error('Error in getMyBuildings:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update building - لا يحتاج تعديل كبير
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

        // ✅ التحقق من صحة status إذا تم تمريره
        if (updates.status) {
            const validStatuses = ['مكتمل', 'قيد_الإنشاء', 'مخطط'];
            if (!validStatuses.includes(updates.status)) {
                return res.status(400).json({ 
                    message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
                });
            }
            // ✅ تحويل status إلى enum value
            updates.status = convertBuildingStatus(updates.status, true);
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

        // ✅ تنسيق الاستجابة مع التحويل
        const formattedBuilding = formatBuildingForResponse(building);

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

// Delete building - MODIFIED للتحقق من العقارات بدلاً من العناصر
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