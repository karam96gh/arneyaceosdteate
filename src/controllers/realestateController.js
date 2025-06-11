const prisma = require('../config/prisma');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// إعداد رفع الملفات
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'src/images/');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        try {
            const fileExtension = path.extname(file.originalname);
            const uniqueName = `${Date.now()}${fileExtension}`;
            cb(null, uniqueName);
        } catch (err) {
            console.error('Error saving file:', err);
            cb(err);
        }
    },
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'coverImage') {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for coverImage!'), false);
        }
    } else {
        cb(null, true);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    }
});

// Get all real estate listings
const getAllRealEstate = async (req, res) => {
    try {
        const realEstates = await prisma.realEstate.findMany({
            include: {
                city: { select: { id: true, name: true } },
                neighborhood: { select: { id: true, name: true } },
                mainCategory: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
                finalType: { select: { id: true, name: true } },
                finalCity: { select: { id: true, name: true } },
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

        // تنسيق البيانات لتتوافق مع الـ API القديم
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
                cityId: realEstate.cityId,
                viewTime: realEstate.viewTime,
                neighborhoodId: realEstate.neighborhoodId,
                price: realEstate.price,
                title: realEstate.title,
                paymentMethod: realEstate.paymentMethod,
                mainCategoryId: realEstate.mainCategoryId,
                subCategoryId: realEstate.subCategoryId,
                coverImage: realEstate.coverImage,
                finalTypeId: realEstate.finalTypeId,
                buildingItemId: realEstate.buildingItemId,
                location: realEstate.location,
                files: realEstate.files.map(f => f.name),
                properties: propertyValuesObj,
                others: realEstate.others ? JSON.parse(realEstate.others) : null
            };
        });

        res.status(200).json(formattedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get real estate by ID
const getRealEstateById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const realEstate = await prisma.realEstate.findUnique({
            where: { id: parseInt(id) },
            include: {
                city: { select: { id: true, name: true } },
                neighborhood: { select: { id: true, name: true } },
                mainCategory: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
                finalType: { select: { id: true, name: true } },
                finalCity: { select: { id: true, name: true } },
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

        // تنسيق البيانات
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
            cityId: realEstate.cityId,
            viewTime: realEstate.viewTime,
            neighborhoodId: realEstate.neighborhoodId,
            price: realEstate.price,
            title: realEstate.title,
            paymentMethod: realEstate.paymentMethod,
            mainCategoryId: realEstate.mainCategoryId,
            subCategoryId: realEstate.subCategoryId,
            coverImage: realEstate.coverImage,
            finalTypeId: realEstate.finalTypeId,
            buildingItemId: realEstate.buildingItemId,
            location: realEstate.location,
            files: realEstate.files.map(f => f.name),
            properties: propertyValuesObj,
            others: realEstate.others ? JSON.parse(realEstate.others) : null
        };

        res.status(200).json(formattedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get real estate by building item ID
const getRealEstateByBuildingItemId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const realEstates = await prisma.realEstate.findMany({
            where: { buildingItemId: id },
            include: {
                city: { select: { id: true, name: true } },
                neighborhood: { select: { id: true, name: true } },
                mainCategory: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
                finalType: { select: { id: true, name: true } },
                finalCity: { select: { id: true, name: true } },
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
            return res.status(200).json({ message: 'No real estate found for this building item' });
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
                cityId: realEstate.cityId,
                viewTime: realEstate.viewTime,
                neighborhoodId: realEstate.neighborhoodId,
                price: realEstate.price,
                title: realEstate.title,
                paymentMethod: realEstate.paymentMethod,
                mainCategoryId: realEstate.mainCategoryId,
                subCategoryId: realEstate.subCategoryId,
                coverImage: realEstate.coverImage,
                finalTypeId: realEstate.finalTypeId,
                buildingItemId: realEstate.buildingItemId,
                location: realEstate.location,
                files: realEstate.files.map(f => f.name),
                properties: propertyValuesObj,
                others: realEstate.others ? JSON.parse(realEstate.others) : null
            };
        });

        res.status(200).json(formattedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add a new real estate listing
const addRealEstate = async (req, res) => {
    try {
        const {
            price, title, cityId, neighborhoodId, paymentMethod, mainCategoryId,
            subCategoryId, finalTypeId, buildingItemId, viewTime, location, 
            description, finalCityId, properties, ...otherData
        } = req.body;

        // الحصول على الملفات
        const coverImage = req.files?.coverImage?.[0]?.filename;
        const files = req.files?.files?.map(file => file.filename) || [];

        // التحقق من الحقول المطلوبة
        if (!price || !title || !cityId || !neighborhoodId || !mainCategoryId || 
            !subCategoryId || !finalTypeId || !coverImage) {
            return res.status(400).json({ 
                message: 'Missing required fields' 
            });
        }

        // إنشاء العقار
        const realEstate = await prisma.realEstate.create({
            data: {
                price: parseInt(price),
                title,
                cityId: parseInt(cityId),
                neighborhoodId: parseInt(neighborhoodId),
                paymentMethod,
                mainCategoryId: parseInt(mainCategoryId),
                subCategoryId: parseInt(subCategoryId),
                finalTypeId: parseInt(finalTypeId),
                buildingItemId,
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
            await prisma.file.createMany({
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
                const property = await prisma.property.findFirst({
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
                await prisma.propertyValue.createMany({
                    data: propertyValues
                });
            }
        }

        res.status(201).json({ 
            id: realEstate.id, 
            message: 'Real estate added successfully' 
        });
    } catch (error) {
        console.error('Error adding real estate:', error);
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

        // تحديث بيانات العقار الأساسية
        if (Object.keys(updateData).length > 0) {
            await prisma.realEstate.update({
                where: { id: parseInt(id) },
                data: updateData
            });
        }

        // تحديث الملفات إذا تم تمرير ملفات جديدة
        if (newFiles && Array.isArray(newFiles) && newFiles.length > 0) {
            // حذف الملفات القديمة أولاً
            await prisma.file.deleteMany({
                where: { realestateId: parseInt(id) }
            });

            // إضافة الملفات الجديدة
            await prisma.file.createMany({
                data: newFiles.map(fileName => ({
                    name: fileName,
                    realestateId: parseInt(id)
                }))
            });
        }

        // تحديث قيم الخصائص إذا تم تمريرها
        if (properties && typeof properties === 'object') {
            // الحصول على نوع العقار النهائي
            const realEstate = await prisma.realEstate.findUnique({
                where: { id: parseInt(id) },
                select: { finalTypeId: true }
            });

            if (realEstate) {
                // حذف قيم الخصائص القديمة
                await prisma.propertyValue.deleteMany({
                    where: { realEstateId: parseInt(id) }
                });

                // إضافة قيم الخصائص الجديدة
                const propertyValues = [];
                for (const [propertyKey, value] of Object.entries(properties)) {
                    if (value !== null && value !== undefined && value !== '') {
                        const property = await prisma.property.findFirst({
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
                    await prisma.propertyValue.createMany({
                        data: propertyValues
                    });
                }
            }
        }

        res.status(200).json({ message: 'Real estate updated successfully' });
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

        // حذف العقار (سيحذف الملفات وقيم الخصائص تلقائياً بسبب cascade)
        await prisma.realEstate.delete({
            where: { id: parseInt(id) }
        });

        res.status(200).json({ message: 'Real estate deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Real estate not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Delete file
const deleteFile = async (req, res) => {
    try {
        const { name } = req.params;

        await prisma.file.deleteMany({
            where: { name }
        });

        res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get similar real estate
const getRealEstateSimilar = async (req, res) => {
    try {
        const { id } = req.params;

        // الحصول على تفاصيل العقار الحالي
        const realEstate = await prisma.realEstate.findUnique({
            where: { id: parseInt(id) },
            select: { 
                mainCategoryId: true, 
                subCategoryId: true, 
                finalTypeId: true,
                cityId: true,
                price: true
            }
        });

        if (!realEstate) {
            return res.status(404).json({ message: 'Real estate not found' });
        }

        // البحث عن عقارات مشابهة
        const similarRealEstates = await prisma.realEstate.findMany({
            where: {
                AND: [
                    { mainCategoryId: realEstate.mainCategoryId },
                    { subCategoryId: realEstate.subCategoryId },
                    { finalTypeId: realEstate.finalTypeId },
                    { id: { not: parseInt(id) } }
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
            orderBy: [
                { cityId: realEstate.cityId ? 'asc' : 'desc' }, // تفضيل نفس المدينة
                { price: 'asc' }
            ],
            take: 10
        });

        res.status(200).json(similarRealEstates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Filter function
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
        buildingItemId: true,
        location: true,
        properties: true // إضافة الخصائص الديناميكية
    };

    if (finall == null) finall = 's';

    const allowedValues = ['محل', 'أرض', 'معرض', 'مخزن', 'مصنع', 'ورشة', 'مبنى','أراضي'];

    if (allowedValues.includes(sub) || allowedValues.includes(finall)) {
        // إخفاء خصائص معينة للأنواع التجارية
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

// Advanced search with filters
const searchRealEstate = async (req, res) => {
    try {
        const {
            cityId,
            neighborhoodId,
            finalCityId,
            mainCategoryId,
            subCategoryId,
            finalTypeId,
            minPrice,
            maxPrice,
            propertyFilters,
            limit = 20,
            offset = 0,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.body;

        const whereClause = {};
        
        // فلاتر أساسية
        if (cityId) whereClause.cityId = parseInt(cityId);
        if (neighborhoodId) whereClause.neighborhoodId = parseInt(neighborhoodId);
        if (finalCityId) whereClause.finalCityId = parseInt(finalCityId);
        if (mainCategoryId) whereClause.mainCategoryId = parseInt(mainCategoryId);
        if (subCategoryId) whereClause.subCategoryId = parseInt(subCategoryId);
        if (finalTypeId) whereClause.finalTypeId = parseInt(finalTypeId);

        // فلتر السعر
        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) whereClause.price.gte = parseInt(minPrice);
            if (maxPrice) whereClause.price.lte = parseInt(maxPrice);
        }

        // فلاتر الخصائص الديناميكية
        if (propertyFilters && Array.isArray(propertyFilters) && propertyFilters.length > 0) {
            whereClause.propertyValues = {
                some: {
                    OR: propertyFilters.map(filter => ({
                        property: { propertyKey: filter.propertyKey },
                        value: filter.operator === 'contains' 
                            ? { contains: filter.value }
                            : filter.value
                    }))
                }
            };
        }

        const realEstates = await prisma.realEstate.findMany({
            where: whereClause,
            include: {
                city: { select: { id: true, name: true } },
                neighborhood: { select: { id: true, name: true } },
                mainCategory: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
                finalType: { select: { id: true, name: true } },
                finalCity: { select: { id: true, name: true } },
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
            orderBy: { [sortBy]: sortOrder },
            skip: parseInt(offset),
            take: parseInt(limit)
        });

        // عد النتائج الإجمالية
        const totalCount = await prisma.realEstate.count({
            where: whereClause
        });

        res.status(200).json({
            data: realEstates,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalCount / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllRealEstate,
    getRealEstateById,
    addRealEstate,
    deleteRealEstate,
    updateRealEstate,
    getRealEstateByBuildingItemId,
    getRealEstateSimilar,
    deleteFile,
    filter,
    searchRealEstate,
    upload
};