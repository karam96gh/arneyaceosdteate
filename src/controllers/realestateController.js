// src/controllers/realestateController.js
const { dbManager } = require('../config/database');
const { uploadMiddlewares, deleteFile: deleteFileFromDisk, buildRealEstateFileUrl } = require('../config/upload');
const path = require('path');

// ✅ استخدام الـ middleware الموحد
const upload = uploadMiddlewares.realEstate;

// Get all real estate listings
const getAllRealEstate = async (req, res) => {
    try {
        const prisma = dbManager.getPrisma();
        
        const realEstates = await prisma.realEstate.findMany({
            include: {
                city: { select: { id: true, name: true } },
                neighborhood: { select: { id: true, name: true } },
                mainCategory: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
                finalType: { select: { id: true, name: true } },
                finalCity: { select: { id: true, name: true } },
                // ✅ إضافة العلاقات الجديدة
                building: { select: { id: true, title: true, status: true } },
                buildingItem: { select: { id: true, name: true, type: true } },
                files: { select: { id: true, name: true } },
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
            orderBy: {
                createdAt: 'desc'
            }
        });

        // تنسيق البيانات
        const formattedData = realEstates.map(realEstate => {
            const propertyValuesObj = {};
            realEstate.propertyValues.forEach(pv => {
                propertyValuesObj[pv.property.propertyKey] = {
                    value: pv.value,
                    property: pv.property
                };
            });

            return {
                id: realEstate.id,
                description: realEstate.description,
                finalCityId: realEstate.finalCityId,
                createdAt: realEstate.createdAt,
                cityName: realEstate.city.name,
                neighborhoodName: realEstate.neighborhood.name,
                mainCategoryName: realEstate.mainCategory.name,
                finalCityName: realEstate.finalCity?.name,
                subCategoryName: realEstate.subCategory.name,
                finalTypeName: realEstate.finalType.name,
                // ✅ إضافة بيانات المباني
                buildingName: realEstate.building?.title,
                buildingItemName: realEstate.buildingItem?.name,
                buildingStatus: realEstate.building?.status,
                buildingItemType: realEstate.buildingItem?.type,
                cityId: realEstate.cityId,
                viewTime: realEstate.viewTime,
                neighborhoodId: realEstate.neighborhoodId,
                price: realEstate.price,
                title: realEstate.title,
                paymentMethod: realEstate.paymentMethod,
                mainCategoryId: realEstate.mainCategoryId,
                subCategoryId: realEstate.subCategoryId,
                // ✅ تحويل coverImage إلى مسار كامل
                coverImage: buildRealEstateFileUrl(realEstate.coverImage),
                finalTypeId: realEstate.finalTypeId,
                // ✅ الحقول المنفصلة
                buildingId: realEstate.buildingId,
                buildingItemId: realEstate.buildingItemId,
                location: realEstate.location,
                // ✅ تحويل files إلى مسارات كاملة
                files: realEstate.files.map(f => buildRealEstateFileUrl(f.name)),
                properties: propertyValuesObj,
                others: realEstate.others ? JSON.parse(realEstate.others) : null
            };
        });

        res.status(200).json(formattedData);
    } catch (error) {
        console.error('Error in getAllRealEstate:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get real estate by ID
const getRealEstateById = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = dbManager.getPrisma();
        
        const realEstate = await prisma.realEstate.findUnique({
            where: { id: parseInt(id) },
            include: {
                city: { select: { id: true, name: true } },
                neighborhood: { select: { id: true, name: true } },
                mainCategory: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
                finalType: { select: { id: true, name: true } },
                finalCity: { select: { id: true, name: true } },
                building: { select: { id: true, title: true, status: true, location: true } },
                buildingItem: { 
                    select: { 
                        id: true, 
                        name: true, 
                        type: true, 
                        price: true, 
                        area: true,
                        building: { select: { title: true, status: true } }
                    } 
                },
                files: { select: { id: true, name: true } },
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
            }
        });

        if (!realEstate) {
            return res.status(404).json({ message: 'Real estate not found' });
        }

        // تنسيق البيانات مع تفاصيل أكثر
        const propertyValuesObj = {};
        realEstate.propertyValues.forEach(pv => {
            propertyValuesObj[pv.property.propertyKey] = {
                value: pv.value,
                property: pv.property
            };
        });

        const formattedData = {
            id: realEstate.id,
            description: realEstate.description,
            finalCityId: realEstate.finalCityId,
            createdAt: realEstate.createdAt,
            cityName: realEstate.city.name,
            neighborhoodName: realEstate.neighborhood.name,
            mainCategoryName: realEstate.mainCategory.name,
            finalCityName: realEstate.finalCity?.name,
            subCategoryName: realEstate.subCategory.name,
            finalTypeName: realEstate.finalType.name,
            buildingInfo: realEstate.building,
            buildingItemInfo: realEstate.buildingItem,
            cityId: realEstate.cityId,
            viewTime: realEstate.viewTime,
            neighborhoodId: realEstate.neighborhoodId,
            price: realEstate.price,
            title: realEstate.title,
            paymentMethod: realEstate.paymentMethod,
            mainCategoryId: realEstate.mainCategoryId,
            subCategoryId: realEstate.subCategoryId,
            // ✅ تحويل coverImage إلى مسار كامل
            coverImage: buildRealEstateFileUrl(realEstate.coverImage),
            finalTypeId: realEstate.finalTypeId,
            buildingId: realEstate.buildingId,
            buildingItemId: realEstate.buildingItemId,
            location: realEstate.location,
            // ✅ تحويل files إلى مسارات كاملة
            files: realEstate.files.map(f => buildRealEstateFileUrl(f.name)),
            properties: propertyValuesObj,
            others: realEstate.others ? JSON.parse(realEstate.others) : null
        };

        res.status(200).json(formattedData);
    } catch (error) {
        console.error('Error in getRealEstateById:', error);
        res.status(500).json({ error: error.message });
    }
};

// Add a new real estate listing
const addRealEstate = async (req, res) => {
    try {
        const {
            price, title, cityId, neighborhoodId, paymentMethod, mainCategoryId,
            subCategoryId, finalTypeId, buildingId, buildingItemId, viewTime, 
            location, description, finalCityId, properties, ...otherData
        } = req.body;

        // الحصول على الملفات
        const coverImage = req.files?.coverImage?.[0]?.filename;
        const files = req.files?.files?.map(file => file.filename) || [];

        // التحقق من الحقول المطلوبة
        if (!price || !title || !cityId || !neighborhoodId || !mainCategoryId || 
            !subCategoryId || !finalTypeId || !coverImage) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                required: ['price', 'title', 'cityId', 'neighborhoodId', 'mainCategoryId', 'subCategoryId', 'finalTypeId', 'coverImage']
            });
        }

        const prisma = dbManager.getPrisma();

        // ✅ التحقق من صحة المراجع
        const validationErrors = [];

        // التحقق من وجود المدينة
        const city = await prisma.city.findUnique({ where: { id: parseInt(cityId) } });
        if (!city) validationErrors.push('City not found');

        // التحقق من وجود الحي
        const neighborhood = await prisma.neighborhood.findUnique({ 
            where: { id: parseInt(neighborhoodId) } 
        });
        if (!neighborhood) validationErrors.push('Neighborhood not found');

        // التحقق من النوع النهائي
        const finalType = await prisma.finalType.findUnique({ 
            where: { id: parseInt(finalTypeId) } 
        });
        if (!finalType) validationErrors.push('Final type not found');

        // التحقق من المبنى (إذا تم تمريره)
        if (buildingId) {
            const building = await prisma.building.findUnique({ 
                where: { id: buildingId } 
            });
            if (!building) validationErrors.push('Building not found');
        }

        // التحقق من عنصر المبنى (إذا تم تمريره)
        if (buildingItemId) {
            const buildingItem = await prisma.buildingItem.findUnique({ 
                where: { id: buildingItemId } 
            });
            if (!buildingItem) validationErrors.push('Building item not found');
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                message: 'Validation errors',
                errors: validationErrors
            });
        }

        // إنشاء العقار داخل transaction
        const result = await prisma.$transaction(async (tx) => {
            // إنشاء العقار
            const realEstate = await tx.realEstate.create({
                data: {
                    price: parseInt(price),
                    title,
                    cityId: parseInt(cityId),
                    neighborhoodId: parseInt(neighborhoodId),
                    paymentMethod,
                    mainCategoryId: parseInt(mainCategoryId),
                    subCategoryId: parseInt(subCategoryId),
                    finalTypeId: parseInt(finalTypeId),
                    buildingId: buildingId || null,
                    buildingItemId: buildingItemId || null,
                    viewTime,
                    location,
                    description,
                    finalCityId: finalCityId ? parseInt(finalCityId) : null,
                    coverImage,
                    createdAt: new Date(),
                    others: Object.keys(otherData).length > 0 ? JSON.stringify(otherData) : null
                }
            });

            // إضافة الملفات إن وجدت
            if (files.length > 0) {
                await tx.file.createMany({
                    data: files.map(fileName => ({
                        name: fileName,
                        realestateId: realEstate.id
                    }))
                });
            }

            // إضافة قيم الخصائص إن وجدت
            if (properties && typeof properties === 'object') {
                const propertyValues = [];
                for (const [propertyKey, value] of Object.entries(properties)) {
                    // البحث عن الخاصية
                    const property = await tx.property.findFirst({
                        where: {
                            propertyKey,
                            finalTypeId: parseInt(finalTypeId)
                        }
                    });

                    if (property && value !== null && value !== undefined && value !== '') {
                        propertyValues.push({
                            realEstateId: realEstate.id,
                            propertyId: property.id,
                            value: typeof value === 'object' ? JSON.stringify(value) : String(value)
                        });
                    }
                }

                if (propertyValues.length > 0) {
                    await tx.propertyValue.createMany({
                        data: propertyValues
                    });
                }
            }

            return realEstate;
        });

        res.status(201).json({ 
            id: result.id, 
            message: 'Real estate added successfully',
            // ✅ إرجاع مسار كامل لصورة الغلاف
            coverImageUrl: buildRealEstateFileUrl(coverImage),
            filesCount: files.length
        });
    } catch (error) {
        console.error('Error adding real estate:', error);
        
        // حذف الملفات المرفوعة في حالة خطأ
        if (req.files?.coverImage?.[0]) {
            deleteFileFromDisk(req.files.coverImage[0].path);
        }
        if (req.files?.files) {
            req.files.files.forEach(file => deleteFileFromDisk(file.path));
        }
        
        res.status(500).json({ error: error.message });
    }
};

// Update real estate
const updateRealEstate = async (req, res) => {
    try {
        const { id } = req.params;
        const { properties, files: newFiles, ...updateData } = req.body;

        // إزالة القيم غير المحددة
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined || updateData[key] === '') {
                delete updateData[key];
            }
        });

        // تحويل القيم الرقمية
        ['price', 'cityId', 'neighborhoodId', 'mainCategoryId', 'subCategoryId', 
         'finalTypeId', 'finalCityId'].forEach(field => {
            if (field in updateData && updateData[field] !== null) {
                updateData[field] = parseInt(updateData[field]);
            }
        });

        const prisma = dbManager.getPrisma();

        // تحديث داخل transaction
        const result = await prisma.$transaction(async (tx) => {
            // تحديث بيانات العقار الأساسية
            let updatedRealEstate = null;
            if (Object.keys(updateData).length > 0) {
                updatedRealEstate = await tx.realEstate.update({
                    where: { id: parseInt(id) },
                    data: updateData
                });
            }

            // تحديث الملفات إذا تم تمرير ملفات جديدة
            if (newFiles && Array.isArray(newFiles) && newFiles.length > 0) {
                // حذف الملفات القديمة أولاً
                await tx.file.deleteMany({
                    where: { realestateId: parseInt(id) }
                });

                // إضافة الملفات الجديدة
                await tx.file.createMany({
                    data: newFiles.map(fileName => ({
                        name: fileName,
                        realestateId: parseInt(id)
                    }))
                });
            }

            // تحديث قيم الخصائص إذا تم تمريرها
            if (properties && typeof properties === 'object') {
                // الحصول على نوع العقار النهائي
                const realEstate = await tx.realEstate.findUnique({
                    where: { id: parseInt(id) },
                    select: { finalTypeId: true }
                });

                if (realEstate) {
                    // حذف قيم الخصائص القديمة
                    await tx.propertyValue.deleteMany({
                        where: { realEstateId: parseInt(id) }
                    });

                    // إضافة قيم الخصائص الجديدة
                    const propertyValues = [];
                    for (const [propertyKey, value] of Object.entries(properties)) {
                        if (value !== null && value !== undefined && value !== '') {
                            const property = await tx.property.findFirst({
                                where: {
                                    propertyKey,
                                    finalTypeId: realEstate.finalTypeId
                                }
                            });

                            if (property) {
                                propertyValues.push({
                                    realEstateId: parseInt(id),
                                    propertyId: property.id,
                                    value: typeof value === 'object' ? JSON.stringify(value) : String(value)
                                });
                            }
                        }
                    }

                    if (propertyValues.length > 0) {
                        await tx.propertyValue.createMany({
                            data: propertyValues
                        });
                    }
                }
            }

            return updatedRealEstate;
        });

        res.status(200).json({ 
            message: 'Real estate updated successfully',
            updated: result ? true : false
        });
    } catch (error) {
        console.error('Error updating real estate:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Real estate not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Delete real estate
const deleteRealEstate = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = dbManager.getPrisma();

        // الحصول على معلومات العقار والملفات قبل الحذف
        const realEstate = await prisma.realEstate.findUnique({
            where: { id: parseInt(id) },
            include: { files: true }
        });

        if (!realEstate) {
            return res.status(404).json({ message: 'Real estate not found' });
        }

        // حذف العقار (سيحذف الملفات وقيم الخصائص تلقائياً بسبب cascade)
        await prisma.realEstate.delete({
            where: { id: parseInt(id) }
        });

        // حذف الملفات الفعلية من النظام
        if (realEstate.coverImage) {
            deleteFileFromDisk(path.join(require('../config/upload').UPLOAD_PATHS.REALESTATE, realEstate.coverImage));
        }

        realEstate.files.forEach(file => {
            deleteFileFromDisk(path.join(require('../config/upload').UPLOAD_PATHS.REALESTATE, file.name));
        });

        res.status(200).json({ 
            message: 'Real estate deleted successfully',
            deletedFilesCount: realEstate.files.length + (realEstate.coverImage ? 1 : 0)
        });
    } catch (error) {
        console.error('Error deleting real estate:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Real estate not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Get real estate by building item ID
const getRealEstateByBuildingItemId = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = dbManager.getPrisma();
        
        const realEstates = await prisma.realEstate.findMany({
            where: { buildingItemId: id },
            include: {
                city: { select: { id: true, name: true } },
                neighborhood: { select: { id: true, name: true } },
                mainCategory: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
                finalType: { select: { id: true, name: true } },
                finalCity: { select: { id: true, name: true } },
                building: { select: { id: true, title: true, status: true } },
                buildingItem: { select: { id: true, name: true, type: true } },
                files: { select: { id: true, name: true } },
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
            }
        });

        if (realEstates.length === 0) {
            return res.status(200).json({ 
                message: 'No real estate found for this building item',
                data: []
            });
        }

        // تنسيق البيانات
        const formattedData = realEstates.map(realEstate => {
            const propertyValuesObj = {};
            realEstate.propertyValues.forEach(pv => {
                propertyValuesObj[pv.property.propertyKey] = {
                    value: pv.value,
                    property: pv.property
                };
            });

            return {
                id: realEstate.id,
                description: realEstate.description,
                finalCityId: realEstate.finalCityId,
                createdAt: realEstate.createdAt,
                cityName: realEstate.city.name,
                neighborhoodName: realEstate.neighborhood.name,
                mainCategoryName: realEstate.mainCategory.name,
                finalCityName: realEstate.finalCity?.name,
                subCategoryName: realEstate.subCategory.name,
                finalTypeName: realEstate.finalType.name,
                buildingName: realEstate.building?.title,
                buildingItemName: realEstate.buildingItem?.name,
                cityId: realEstate.cityId,
                viewTime: realEstate.viewTime,
                neighborhoodId: realEstate.neighborhoodId,
                price: realEstate.price,
                title: realEstate.title,
                paymentMethod: realEstate.paymentMethod,
                mainCategoryId: realEstate.mainCategoryId,
                subCategoryId: realEstate.subCategoryId,
                // ✅ تحويل coverImage إلى مسار كامل
                coverImage: buildRealEstateFileUrl(realEstate.coverImage),
                finalTypeId: realEstate.finalTypeId,
                buildingId: realEstate.buildingId,
                buildingItemId: realEstate.buildingItemId,
                location: realEstate.location,
                // ✅ تحويل files إلى مسارات كاملة
                files: realEstate.files.map(f => buildRealEstateFileUrl(f.name)),
                properties: propertyValuesObj,
                others: realEstate.others ? JSON.parse(realEstate.others) : null
            };
        });

        res.status(200).json({
            message: `Found ${realEstates.length} real estate(s) for building item`,
            count: realEstates.length,
            data: formattedData
        });
    } catch (error) {
        console.error('Error in getRealEstateByBuildingItemId:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get similar real estate
const getRealEstateSimilar = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = dbManager.getPrisma();

        // الحصول على تفاصيل العقار الحالي
        const realEstate = await prisma.realEstate.findUnique({
            where: { id: parseInt(id) },
            select: { 
                mainCategoryId: true, 
                subCategoryId: true, 
                finalTypeId: true,
                cityId: true,
                neighborhoodId: true,
                price: true
            }
        });

        if (!realEstate) {
            return res.status(404).json({ message: 'Real estate not found' });
        }

        // البحث عن عقارات مشابهة مع نظام scoring
        const similarRealEstates = await prisma.realEstate.findMany({
            where: {
                AND: [
                    { id: { not: parseInt(id) } },
                    {
                        OR: [
                            // نفس النوع النهائي (أولوية عالية)
                            { finalTypeId: realEstate.finalTypeId },
                            // نفس النوع الفرعي (أولوية متوسطة)
                            { subCategoryId: realEstate.subCategoryId },
                            // نفس النوع الرئيسي (أولوية منخفضة)
                            { mainCategoryId: realEstate.mainCategoryId }
                        ]
                    }
                ]
            },
            include: {
                city: { select: { id: true, name: true } },
                neighborhood: { select: { id: true, name: true } },
                mainCategory: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
                finalType: { select: { id: true, name: true } },
                finalCity: { select: { id: true, name: true } },
                files: { select: { id: true, name: true } }
            },
            take: 20 // نأخذ 20 ونرتبهم بـ scoring
        });

        // ترتيب حسب التشابه
        const scoredResults = similarRealEstates.map(item => {
            let score = 0;
            
            // نفس النوع النهائي (+30 نقطة)
            if (item.finalTypeId === realEstate.finalTypeId) score += 30;
            // نفس النوع الفرعي (+20 نقطة)
            if (item.subCategoryId === realEstate.subCategoryId) score += 20;
            // نفس النوع الرئيسي (+10 نقاط)
            if (item.mainCategoryId === realEstate.mainCategoryId) score += 10;
            // نفس المدينة (+15 نقطة)
            if (item.cityId === realEstate.cityId) score += 15;
            // نفس الحي (+10 نقاط)
            if (item.neighborhoodId === realEstate.neighborhoodId) score += 10;
            // سعر مقارب (+5 نقاط إذا الفرق أقل من 20%)
            const priceDiff = Math.abs(item.price - realEstate.price) / realEstate.price;
            if (priceDiff < 0.2) score += 5;

            return { 
                ...item, 
                // ✅ تحويل coverImage إلى مسار كامل
                coverImage: buildRealEstateFileUrl(item.coverImage),
                // ✅ تحويل files إلى مسارات كاملة  
                files: item.files.map(f => buildRealEstateFileUrl(f.name)),
                similarityScore: score 
            };
        });

        // ترتيب حسب النقاط ثم التاريخ
        const sortedResults = scoredResults
            .sort((a, b) => {
                if (b.similarityScore !== a.similarityScore) {
                    return b.similarityScore - a.similarityScore;
                }
                return new Date(b.createdAt) - new Date(a.createdAt);
            })
            .slice(0, 10); // أفضل 10 نتائج

        res.status(200).json({
            message: `Found ${sortedResults.length} similar properties`,
            originalPropertyId: parseInt(id),
            similarProperties: sortedResults
        });
    } catch (error) {
        console.error('Error in getRealEstateSimilar:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete file - ✅ إعادة تسمية لتجنب التضارب
const deleteFileFromDB = async (req, res) => {
    try {
        const { name } = req.params;
        const prisma = dbManager.getPrisma();

        const deletedFiles = await prisma.file.deleteMany({
            where: { name }
        });

        // حذف الملف الفعلي من النظام
        const filePath = path.join(require('../config/upload').UPLOAD_PATHS.REALESTATE, name);
        const fileDeleted = deleteFileFromDisk(filePath);

        res.status(200).json({ 
            message: 'File deleted successfully',
            deletedFromDB: deletedFiles.count,
            deletedFromDisk: fileDeleted
        });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: error.message });
    }
};

// Filter function (legacy support)
const filter = (req, res) => {
    let { main, sub, finall } = req.body;
    let realestateFields = {
        id: true,
        description: true,
        finalCityId: true,
        cityId: true,
        viewTime: true,
        neighborhoodId: true,
        price: true,
        title: true,
        paymentMethod: true,
        mainCategoryId: true,
        subCategoryId: true,
        coverImage: true,
        finalTypeId: true,
        buildingId: true,      // ✅ حقل منفصل
        buildingItemId: true,  // ✅ حقل منفصل
        location: true,
        properties: true
    };

    if (finall == null) finall = 's';

    const allowedValues = ['محل', 'أرض', 'معرض', 'مخزن', 'مصنع', 'ورشة', 'مبنى','أراضي'];

    if (allowedValues.includes(sub) || allowedValues.includes(finall)) {
        realestateFields.hideResidentialProperties = true;
    }

    if (sub === 'مبنى' || finall === 'مبنى') {
        realestateFields.showBuildingProperties = true;
    }

    if (main === 'إيجار') {
        realestateFields.showRentalProperties = true;
    }

    return res.json(realestateFields);
};

module.exports = {
    getAllRealEstate,
    getRealEstateById,
    addRealEstate,
    deleteRealEstate,
    updateRealEstate,
    getRealEstateByBuildingItemId,
    getRealEstateSimilar,
    deleteFile: deleteFileFromDB, // ✅ إصلاح التضارب
    filter,
    upload
};