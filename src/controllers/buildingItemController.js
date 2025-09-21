// src/controllers/buildingItemController.js - MODIFIED VERSION (التعامل مع RealEstate بدلاً من BuildingItem)
const { dbManager } = require('../config/database');
const { buildRealEstateFileUrl } = require('../config/upload');

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
        updatedAt: realEstate.updatedAt,
        // ✅ إضافة معلومات الشركة
        companyName: realEstate.company?.companyName || null,
        companyPhone: realEstate.company?.phone || null
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

// Get building items by building ID - MODIFIED (العقارات بدلاً من العناصر)
const getBuildingItems = async (req, res) => {
    try {
        const { buildingId } = req.params;
        const prisma = dbManager.getPrisma();

        // ✅ جلب العقارات المرتبطة بالمبنى بدلاً من building items
        const realEstates = await prisma.realEstate.findMany({
            where: { buildingId },
            include: {
                city: { select: { name: true } },
                neighborhood: { select: { name: true } },
                finalType: { select: { name: true } },
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
                files: { select: { name: true } },
                propertyValues: {
                    include: {
                        property: {
                            select: {
                                id: true,
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
        });

        // تنسيق البيانات لتتوافق مع الـ API القديم - FIXED
        const formattedItems = realEstates.map(realEstate => ({
            ...formatRealEstateAsItem(realEstate),
            realestateCount: 1, // كل عقار هو عنصر واحد
            // ✅ إضافة معلومات الشركة
            companyName: realEstate.company?.companyName || null,
            companyPhone: realEstate.company?.phone || null
        }));

        res.status(200).json(formattedItems);
    } catch (error) {
        console.error('Error in getBuildingItems:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create building item - MODIFIED (إنشاء عقار بدلاً من عنصر)
const createBuildingItem = async (req, res) => {
    try {
        const { 
            name,           // سيصبح title
            price, 
            area,           // سيذهب في properties
            type,           // سيحدد finalTypeId
            building_id, 
            companyId,
            // إضافة حقول إضافية للعقار
            cityId,
            neighborhoodId,
            mainCategoryId,
            subCategoryId,
            finalTypeId,
            coverImage = 'default.jpg',
            description,
            paymentMethod = 'cash',
            location = '0.0,0.0'
        } = req.body;
        
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
            select: { 
                id: true, 
                companyId: true,
                // جلب معلومات افتراضية للمبنى
                city: true,
                neighborhood: true
            },
            include: {
                realEstates: {
                    take: 1,
                    select: {
                        cityId: true,
                        neighborhoodId: true,
                        mainCategoryId: true,
                        subCategoryId: true
                    }
                }
            }
        });

        if (!building) {
            return res.status(404).json({ message: 'Building not found' });
        }

        // ✅ تحديد الشركة المالكة
        let finalCompanyId = companyId;
        
        if (req.user.role === 'company') {
            finalCompanyId = req.user.id;
            if (building.companyId !== req.user.id) {
                return res.status(403).json({ message: 'Access denied to this building' });
            }
        } else if (req.user.role === 'admin') {
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

        // ✅ تحديد القيم الافتراضية من عقارات المبنى الموجودة
        const sampleRealEstate = building.realEstates[0];
        const defaultCityId = cityId || sampleRealEstate?.cityId || 1;
        const defaultNeighborhoodId = neighborhoodId || sampleRealEstate?.neighborhoodId || 1;
        const defaultMainCategoryId = mainCategoryId || sampleRealEstate?.mainCategoryId || 1;
        const defaultSubCategoryId = subCategoryId || sampleRealEstate?.subCategoryId || 1;

        // ✅ تحديد finalTypeId بناءً على النوع
        let determinedFinalTypeId = finalTypeId;
        if (!determinedFinalTypeId) {
            // البحث عن finalType مناسب للنوع
            const typeMapping = {
                'apartment': 'شقة',
                'shop': 'محل',
                'villa': 'فيلا', 
                'office': 'مكتب'
            };
            
            const finalType = await prisma.finalType.findFirst({
                where: {
                    name: {
                        contains: typeMapping[type]
                    }
                }
            });
            
            determinedFinalTypeId = finalType?.id || 1; // افتراضي
        }

        // ✅ إنشاء العقار بدلاً من building item
        const realEstate = await prisma.realEstate.create({
            data: {
                title: name.trim(),                    // اسم العنصر كعنوان العقار
                price: parseInt(price),
                cityId: parseInt(defaultCityId),
                neighborhoodId: parseInt(defaultNeighborhoodId),
                mainCategoryId: parseInt(defaultMainCategoryId),
                subCategoryId: parseInt(defaultSubCategoryId),
                finalTypeId: parseInt(determinedFinalTypeId),
                buildingId: building_id,
                companyId: parseInt(finalCompanyId),
                coverImage: coverImage,
                description: description || `${typeMapping[type]} في ${building.title}`,
                paymentMethod: paymentMethod,
                location: location,
                advertiserType: 'company',
                advertiserName: company.companyName,
                advertiserPhone: company.phone,
                createdAt: new Date()
            },
            include: {
                city: { select: { name: true } },
                neighborhood: { select: { name: true } },
                finalType: { select: { name: true } },
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
        });

        // ✅ إضافة المساحة كخاصية إذا تم تمريرها
        if (area) {
            // البحث عن خاصية المساحة
            const areaProperty = await prisma.property.findFirst({
                where: {
                    finalTypeId: parseInt(determinedFinalTypeId),
                    propertyKey: 'area'
                }
            });

            if (areaProperty) {
                await prisma.propertyValue.create({
                    data: {
                        realEstateId: realEstate.id,
                        propertyId: areaProperty.id,
                        value: area.toString()
                    }
                });
            }
        }

        // ✅ تنسيق الاستجابة كـ building item
        const formattedItem = formatRealEstateAsItem(realEstate);

        res.status(201).json(formattedItem);
    } catch (error) {
        console.error('Error in createBuildingItem:', error);
        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Invalid building ID or company ID' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Update building item - MODIFIED (تحديث عقار بدلاً من عنصر)
const updateBuildingItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, area, type, ...otherUpdates } = req.body;
        const prisma = dbManager.getPrisma();

        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'No fields provided to update' });
        }

        // ✅ بناء بيانات التحديث للعقار
        const updateData = { ...otherUpdates };
        
        if (name) updateData.title = name.trim();
        if (price) updateData.price = parseInt(price);

        // التحقق من صحة النوع إذا تم تمريره
        if (type) {
            const validTypes = ['apartment', 'shop', 'villa', 'office'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ 
                    message: 'Invalid type. Must be one of: ' + validTypes.join(', ') 
                });
            }
            
            // تحديد finalType جديد بناءً على النوع
            const typeMapping = {
                'apartment': 'شقة',
                'shop': 'محل', 
                'villa': 'فيلا',
                'office': 'مكتب'
            };
            
            const finalType = await prisma.finalType.findFirst({
                where: {
                    name: {
                        contains: typeMapping[type]
                    }
                }
            });
            
            if (finalType) {
                updateData.finalTypeId = finalType.id;
            }
        }

        // إزالة القيم غير المحددة
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        // ✅ التحقق من ملكية العقار للشركة
        if (req.user.role === 'company') {
            const existingRealEstate = await prisma.realEstate.findUnique({
                where: { id: parseInt(id) },
                select: { companyId: true }
            });

            if (!existingRealEstate) {
                return res.status(404).json({ message: 'Building item not found' });
            }

            if (existingRealEstate.companyId !== req.user.id) {
                return res.status(403).json({ message: 'Access denied to this building item' });
            }
        }

        // ✅ تحديث العقار
        const realEstate = await prisma.realEstate.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                city: { select: { name: true } },
                neighborhood: { select: { name: true } },
                finalType: { select: { name: true } },
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
        });

        // ✅ تحديث المساحة إذا تم تمريرها
        if (area && realEstate.finalTypeId) {
            const areaProperty = await prisma.property.findFirst({
                where: {
                    finalTypeId: realEstate.finalTypeId,
                    propertyKey: 'area'
                }
            });

            if (areaProperty) {
                await prisma.propertyValue.upsert({
                    where: {
                        realEstateId_propertyId: {
                            realEstateId: parseInt(id),
                            propertyId: areaProperty.id
                        }
                    },
                    update: {
                        value: area.toString()
                    },
                    create: {
                        realEstateId: parseInt(id),
                        propertyId: areaProperty.id,
                        value: area.toString()
                    }
                });
            }
        }

        // ✅ تنسيق الاستجابة
        const formattedItem = formatRealEstateAsItem(realEstate);

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

// Delete building item - MODIFIED (حذف عقار بدلاً من عنصر)
const deleteBuildingItem = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = dbManager.getPrisma();

        // التحقق من وجود العقار
        const realEstate = await prisma.realEstate.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                companyId: true,
                title: true,
                buildingId: true
            }
        });

        if (!realEstate) {
            return res.status(404).json({ message: 'Building item not found' });
        }

        // ✅ التحقق من ملكية العقار للشركة
        if (req.user.role === 'company' && realEstate.companyId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied to this building item' });
        }

        // ✅ حذف العقار (سيحذف تلقائياً propertyValues و files بسبب cascade)
        await prisma.realEstate.delete({
            where: { id: parseInt(id) }
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

// Get building item by ID - MODIFIED (الحصول على عقار بدلاً من عنصر)
const getBuildingItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = dbManager.getPrisma();

        const realEstate = await prisma.realEstate.findUnique({
            where: { id: parseInt(id) },
            include: {
                city: { select: { name: true } },
                neighborhood: { select: { name: true } },
                finalType: { select: { name: true } },
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
                files: { select: { name: true } },
                propertyValues: {
                    include: {
                        property: {
                            select: {
                                propertyKey: true,
                                propertyName: true,
                                dataType: true,
                                unit: true,
                                groupName: true
                            }
                        }
                    }
                }
            }
        });

        if (!realEstate) {
            return res.status(404).json({ message: 'Building item not found' });
        }

        const formattedItem = {
            ...formatRealEstateAsItem(realEstate),
            realestateCount: 1, // كل عقار هو عنصر واحد
            companyName: realEstate.company?.companyName || null,
            companyPhone: realEstate.company?.phone || null,
            companyEmail: realEstate.company?.email || null
        };

        res.status(200).json(formattedItem);
    } catch (error) {
        console.error('Error in getBuildingItemById:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get all building items (for admin) - MODIFIED
const getAllBuildingItems = async (req, res) => {
    try {
        const { page = 1, limit = 10, buildingId, type } = req.query;
        const prisma = dbManager.getPrisma();
        
        const whereClause = {};
        if (buildingId) whereClause.buildingId = buildingId;
        
        // ✅ فلتر النوع عبر finalType
        if (type) {
            const typeMapping = {
                'apartment': 'شقة',
                'shop': 'محل',
                'villa': 'فيلا',
                'office': 'مكتب'
            };
            
            whereClause.finalType = {
                name: {
                    contains: typeMapping[type] || type }
            };
        }

        // ✅ إضافة فلتر للشركة
        if (req.user && req.user.role === 'company') {
            whereClause.companyId = req.user.id;
        }

        const realEstates = await prisma.realEstate.findMany({
            where: whereClause,
            include: {
                city: { select: { name: true } },
                neighborhood: { select: { name: true } },
                finalType: { select: { name: true } },
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
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        const totalCount = await prisma.realEstate.count({
            where: whereClause
        });

        const formattedItems = realEstates.map(realEstate => ({
            ...formatRealEstateAsItem(realEstate),
            realestateCount: 1, // كل عقار هو عنصر واحد
            companyName: realEstate.company?.companyName || null,
            companyPhone: realEstate.company?.phone || null
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