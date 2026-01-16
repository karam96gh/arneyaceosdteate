// src/controllers/realestateController.js - COMPLETE FIXED VERSION
const { dbManager } = require('../config/database');
const { uploadMiddlewares, deleteFile: deleteFileFromDisk, buildRealEstateFileUrl } = require('../config/upload');
const path = require('path');

// ✅ استخدام الـ middleware الموحد
const upload = uploadMiddlewares.realEstate;

// Get all real estate listings - FIXED
const getAllRealEstate = async (req, res) => {
    try {
        const prisma = dbManager.getPrisma();
        
        // ✅ إضافة فلتر للشركة
        let whereClause = {};
        if (req.user && req.user.role === 'company') {
            whereClause.companyId = req.user.id;
        }
        console.log("sdds",req.user);
        const realEstates = await prisma.realEstate.findMany({
            where: whereClause,
            include: {
                city: { select: { id: true, name: true } },
                neighborhood: { select: { id: true, name: true } },
                mainCategory: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
                finalType: { select: { id: true, name: true } },
                finalCity: { select: { id: true, name: true } },
                building: { select: { id: true, title: true, status: true } },
                buildingItem: { select: { id: true, name: true, type: true } },
                // ✅ إضافة معلومات الشركة بشكل صحيح
                company: { 
                    select: { 
                        id: true, 
                        companyName: true, 
                        phone: true,
                        email: true
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

        // تنسيق البيانات - FIXED
        const formattedData = realEstates.map(realEstate => {
            const propertyValuesObj = {};
            realEstate.propertyValues.forEach(pv => {
                let processedValue = pv.value;
                let fileUrl = null;

                // معالجة خاصة للخصائص من نوع FILE
                if (pv.property.dataType === 'FILE') {
                    try {
                        const fileInfo = JSON.parse(pv.value);
                        // استخراج رابط الملف
                        fileUrl = require('../config/upload').buildPropertyFileUrl(pv.property.propertyKey, fileInfo.fileName);
                        processedValue = fileUrl; // وضع الرابط في value
                    } catch (parseError) {
                        console.warn('Failed to parse FILE property:', pv.property.propertyKey, parseError.message);
                        processedValue = pv.value;
                    }
                }

                propertyValuesObj[pv.property.propertyKey] = {
                    value: processedValue,
                    url: fileUrl, // إضافة url منفصل
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
                buildingStatus: realEstate.building?.status,
                buildingItemType: realEstate.buildingItem?.type,
                // ✅ إصلاح معلومات الشركة
                companyId: realEstate.companyId,
                companyName: realEstate.company?.companyName || null,
                companyPhone: realEstate.company?.phone || null,
                companyEmail: realEstate.company?.email || null,
                cityId: realEstate.cityId,
                viewTime: realEstate.viewTime,
                neighborhoodId: realEstate.neighborhoodId,
                price: realEstate.price,
                title: realEstate.title,
                paymentMethod: realEstate.paymentMethod,
                mainCategoryId: realEstate.mainCategoryId,
                subCategoryId: realEstate.subCategoryId,
                advertiserType: realEstate.advertiserType || "user",
                advertiserName: realEstate.advertiserName || "",
                advertiserPhone: realEstate.advertiserPhone || "",
                advertiserWhatsapp: realEstate.advertiserWhatsapp || "",
                coverImage: buildRealEstateFileUrl(realEstate.coverImage),
                finalTypeId: realEstate.finalTypeId,
                buildingId: realEstate.buildingId,
                buildingItemId: realEstate.buildingItemId,
                location: realEstate.location,
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

// Get real estate by ID - FIXED
const getRealEstateById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ 
                error: 'Invalid or missing ID parameter',
                message: 'ID must be a valid number' 
            });
        }

        const prisma = dbManager.getPrisma();
        
        const realEstate = await prisma.realEstate.findUnique({
            where: { 
                id: parseInt(id)
            },
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
                // ✅ إضافة معلومات الشركة المالكة بشكل صحيح
                company: { 
                    select: { 
                        id: true, 
                        companyName: true, 
                        phone: true,
                        email: true,
                        fullName: true
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
            return res.status(404).json({ 
                error: 'Real estate not found',
                message: `No real estate found with ID: ${id}` 
            });
        }

        // تنسيق البيانات مع تفاصيل أكثر
        const propertyValuesObj = {};
        realEstate.propertyValues.forEach(pv => {
            let processedValue = pv.value;
            let fileUrl = null;

            // معالجة خاصة للخصائص من نوع FILE
            if (pv.property.dataType === 'FILE') {
                try {
                    const fileInfo = JSON.parse(pv.value);
                    // استخراج رابط الملف
                    fileUrl = require('../config/upload').buildPropertyFileUrl(pv.property.propertyKey, fileInfo.fileName);
                    processedValue = fileUrl; // وضع الرابط في value
                } catch (parseError) {
                    console.warn('Failed to parse FILE property:', pv.property.propertyKey, parseError.message);
                    processedValue = pv.value;
                }
            }

            propertyValuesObj[pv.property.propertyKey] = {
                value: processedValue,
                url: fileUrl, // إضافة url منفصل
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
            // ✅ إضافة معلومات الشركة بشكل صحيح
            companyId: realEstate.companyId,
            companyName: realEstate.company?.companyName || null,
            companyPhone: realEstate.company?.phone || null,
            companyEmail: realEstate.company?.email || null,
            companyFullName: realEstate.company?.fullName || null,
            cityId: realEstate.cityId,
            viewTime: realEstate.viewTime,
            neighborhoodId: realEstate.neighborhoodId,
            price: realEstate.price,
            title: realEstate.title,
            paymentMethod: realEstate.paymentMethod,
            mainCategoryId: realEstate.mainCategoryId,
            subCategoryId: realEstate.subCategoryId,
            advertiserType: realEstate.advertiserType || "user",
            advertiserName: realEstate.advertiserName || "",
            advertiserPhone: realEstate.advertiserPhone || "",
            advertiserWhatsapp: realEstate.advertiserWhatsapp || "",
            coverImage: buildRealEstateFileUrl(realEstate.coverImage),
            finalTypeId: realEstate.finalTypeId,
            buildingId: realEstate.buildingId,
            buildingItemId: realEstate.buildingItemId,
            location: realEstate.location,
            files: realEstate.files.map(f => buildRealEstateFileUrl(f.name)),
            properties: propertyValuesObj,
            others: realEstate.others ? JSON.parse(realEstate.others) : null
        };

        res.status(200).json(formattedData);
    } catch (error) {
        console.error('Error in getRealEstateById:', error);
        
        if (error.code === 'P2025') {
            return res.status(404).json({ 
                error: 'Real estate not found',
                message: 'The requested real estate does not exist' 
            });
        }
        
        if (error.code === 'P2021') {
            return res.status(500).json({ 
                error: 'Database connection error',
                message: 'Unable to connect to the database' 
            });
        }

        res.status(500).json({ 
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

// Add a new real estate listing - FIXED
const addRealEstate = async (req, res) => {
    try {
        console.log('=== ADD REAL ESTATE START (SERVER VERSION) ===');
        console.log('Environment:', process.env.NODE_ENV || 'development');
        console.log('Headers received:', Object.keys(req.headers));
        console.log('Authorization header present:', !!req.headers.authorization);
        console.log('req.user at start:', !!req.user);
        
        // ✅ تحقق صارم من req.user
        if (!req.user) {
            console.log('❌ CRITICAL: req.user is missing on server');
            console.log('This should not happen if server auth fix is working');
            console.log('Request details:', {
                method: req.method,
                url: req.originalUrl,
                hasAuthHeader: !!req.headers.authorization,
                contentType: req.headers['content-type']
            });
            
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Authentication required. User not found in request. Make sure you are sending a valid Authorization token.',
                    server: 'production',
                    timestamp: new Date().toISOString()
                },
                debug: {
                    hasUser: !!req.user,
                    headers: Object.keys(req.headers),
                    method: req.method,
                    url: req.originalUrl,
                    authHeader: req.headers.authorization ? 'Present' : 'Missing',
                    suggestion: 'Check if server auth middleware is running before this function'
                }
            });
        }

        console.log('✅ User authenticated successfully:', {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role,
            isCompany: req.user.isCompany
        });

        // استخراج البيانات من req.body
        const {
            price, title, cityId, neighborhoodId, paymentMethod, mainCategoryId,
            subCategoryId, finalTypeId, buildingId, buildingItemId, viewTime, 
            location, description, finalCityId, properties, companyId, ...otherData
        } = req.body;

        console.log('Request body data:', {
            hasPrice: !!price,
            hasTitle: !!title,
            hasCityId: !!cityId,
            hasMainCategoryId: !!mainCategoryId,
            bodyKeys: Object.keys(req.body)
        });

        // ✅ تحديد الشركة المالكة مع معالجة أفضل
        let finalCompanyId = null;
        
        console.log('Determining company ownership...');
        console.log('User role:', req.user.role);
        console.log('User ID:', req.user.id);
        console.log('Provided companyId in body:', companyId);
        
        if (req.user.role === 'company') {
            finalCompanyId = req.user.id;
            console.log('✅ Company user - using their own ID:', finalCompanyId);
        } else if (req.user.role === 'admin') {
            if (companyId) {
                finalCompanyId = parseInt(companyId);
                console.log('✅ Admin user - using provided company ID:', finalCompanyId);
            } else {
                console.log('❌ Admin user but no companyId provided in request body');
                return res.status(400).json({ 
                    success: false,
                    error: {
                        code: 'MISSING_COMPANY_ID',
                        message: 'Company ID is required in request body for admin users'
                    }
                });
            }
        } else {
            console.log('❌ Invalid user role for creating real estate:', req.user.role);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: 'Only company users and admins can create real estate listings'
                }
            });
        }

        // فحص الملفات المرفوعة (multer().any() يضع الملفات في مصفوفة واحدة)
        console.log('All uploaded files:', req.files?.map(f => f.fieldname) || []);

        // فصل الملفات حسب النوع
        let coverImage = null;
        const files = [];
        const propertyFiles = {}; // ملفات الخصائص الديناميكية

        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(file => {
                if (file.fieldname === 'coverImage') {
                    coverImage = file.filename;
                } else if (file.fieldname === 'files') {
                    files.push(file.filename);
                } else {
                    // أي ملف آخر يعتبر من ملفات الخصائص
                    propertyFiles[file.fieldname] = file;
                }
            });
        }

        console.log('Files categorized:', {
            coverImage: coverImage || 'MISSING',
            additionalFiles: files.length,
            propertyFiles: Object.keys(propertyFiles),
            totalFiles: (coverImage ? 1 : 0) + files.length + Object.keys(propertyFiles).length
        });

        // التحقق من الحقول المطلوبة
        const requiredFields = [
            { key: 'price', value: price },
            { key: 'title', value: title },
            { key: 'cityId', value: cityId },
            { key: 'neighborhoodId', value: neighborhoodId },
            { key: 'mainCategoryId', value: mainCategoryId },
            { key: 'subCategoryId', value: subCategoryId },
            { key: 'finalTypeId', value: finalTypeId },
            { key: 'coverImage', value: coverImage },
            { key: 'companyId', value: finalCompanyId }
        ];

        const missingFields = requiredFields
            .filter(field => !field.value)
            .map(field => field.key);

        if (missingFields.length > 0) {
            console.log('❌ Missing required fields:', missingFields);
            
            // حذف الملفات المرفوعة في حالة خطأ
            if (coverImage) {
                try {
                    await deleteFileFromDisk(path.join(require('../config/upload').UPLOAD_PATHS.REALESTATE, coverImage));
                } catch (cleanupError) {
                    console.warn('Could not delete cover image:', cleanupError.message);
                }
            }
            
            files.forEach(async (filename) => {
                try {
                    await deleteFileFromDisk(path.join(require('../config/upload').UPLOAD_PATHS.REALESTATE, filename));
                } catch (cleanupError) {
                    console.warn('Could not delete file:', cleanupError.message);
                }
            });
            
            return res.status(400).json({ 
                success: false,
                error: {
                    code: 'MISSING_REQUIRED_FIELDS',
                    message: 'Missing required fields',
                    missingFields: missingFields,
                    allRequiredFields: requiredFields.map(f => f.key)
                }
            });
        }

        console.log('✅ All required fields present');

        // الاتصال بقاعدة البيانات
        const prisma = dbManager.getPrisma();
        console.log('Connected to database');

        // التحقق من صحة المراجع
        console.log('Validating database references...');
        
        try {
            const validationPromises = [
                prisma.user.findUnique({ 
                    where: { id: parseInt(finalCompanyId) },
                    select: { id: true, role: true, isActive: true, companyName: true }
                }),
                prisma.city.findUnique({ where: { id: parseInt(cityId) } }),
                prisma.neighborhood.findUnique({ where: { id: parseInt(neighborhoodId) } }),
                prisma.mainType.findUnique({ where: { id: parseInt(mainCategoryId) } }),
                prisma.subType.findUnique({ where: { id: parseInt(subCategoryId) } }),
                prisma.finalType.findUnique({ where: { id: parseInt(finalTypeId) } })
            ];

            const [company, city, neighborhood, mainType, subType, finalType] = 
                await Promise.all(validationPromises);

            const validationErrors = [];
            
            if (!company) validationErrors.push('Company not found');
            else if (company.role !== 'COMPANY') validationErrors.push('Invalid company user type');
            else if (!company.isActive) validationErrors.push('Company account is inactive');
            
            if (!city) validationErrors.push('City not found');
            if (!neighborhood) validationErrors.push('Neighborhood not found');
            if (!mainType) validationErrors.push('Main category not found');
            if (!subType) validationErrors.push('Sub category not found');
            if (!finalType) validationErrors.push('Final type not found');

            if (validationErrors.length > 0) {
                console.log('❌ Validation errors:', validationErrors);
                return res.status(400).json({ 
                    success: false,
                    error: {
                        code: 'VALIDATION_FAILED',
                        message: 'Database validation failed',
                        validationErrors: validationErrors
                    }
                });
            }

            console.log('✅ All database references validated');

            // إنشاء العقار في transaction
            console.log('Creating real estate record...');
            
            const result = await prisma.$transaction(async (tx) => {
                // إنشاء العقار
                const realEstate = await tx.realEstate.create({
                    data: {
                        price: parseInt(price),
                        title: title.trim(),
                        cityId: parseInt(cityId),
                        neighborhoodId: parseInt(neighborhoodId),
                        paymentMethod: paymentMethod || 'cash',
                        mainCategoryId: parseInt(mainCategoryId),
                        subCategoryId: parseInt(subCategoryId),
                        finalTypeId: parseInt(finalTypeId),
                        buildingId: buildingId || null,
                        buildingItemId: buildingItemId || null,
                        companyId: parseInt(finalCompanyId),
                        viewTime: viewTime || null,
                        location: location || '0.0,0.0',
                        description: description || null,
                        finalCityId: finalCityId ? parseInt(finalCityId) : null,
                        coverImage,
                        createdAt: new Date(),
                        others: Object.keys(otherData).length > 0 ? JSON.stringify(otherData) : null
                    }
                });

                console.log('✅ Real estate record created, ID:', realEstate.id);

                // إضافة الملفات الإضافية
                if (files.length > 0) {
                    await tx.file.createMany({
                        data: files.map(fileName => ({
                            name: fileName,
                            realestateId: realEstate.id
                        }))
                    });
                    console.log('✅ Added', files.length, 'additional files');
                }

                // إضافة قيم الخصائص (القيم النصية والرقمية)
                if (properties && typeof properties === 'object') {
                    console.log('Processing property values...');
                    const propertyValues = [];

                    for (const [propertyKey, value] of Object.entries(properties)) {
                        if (value !== null && value !== undefined && value !== '') {
                            const property = await tx.property.findFirst({
                                where: {
                                    propertyKey,
                                    finalTypeId: parseInt(finalTypeId)
                                },
                                select: {
                                    id: true,
                                    dataType: true,
                                    propertyKey: true
                                }
                            });

                            if (property) {
                                // تخطي خصائص FILE - سيتم معالجتها من propertyFiles
                                if (property.dataType === 'FILE') {
                                    console.log(`⚠️ Skipping FILE property '${propertyKey}' - will be processed from uploaded files`);
                                    continue;
                                }

                                // معالجة القيم العادية فقط
                                let processedValue;
                                if (typeof value === 'object' && !(value instanceof File)) {
                                    processedValue = JSON.stringify(value);
                                } else if (typeof value === 'string') {
                                    processedValue = value;
                                } else {
                                    processedValue = String(value);
                                }

                                propertyValues.push({
                                    realEstateId: realEstate.id,
                                    propertyId: property.id,
                                    value: processedValue
                                });
                            }
                        }
                    }

                    if (propertyValues.length > 0) {
                        await tx.propertyValue.createMany({
                            data: propertyValues
                        });
                        console.log('✅ Added', propertyValues.length, 'property values');
                    }
                }

                // معالجة ملفات الخصائص الديناميكية
                if (Object.keys(propertyFiles).length > 0) {
                    console.log('Processing property files...');

                    for (const [propertyKey, uploadedFile] of Object.entries(propertyFiles)) {
                        console.log(`📄 Processing FILE property: ${propertyKey}`);

                        // البحث عن الخاصية في قاعدة البيانات
                        const property = await tx.property.findFirst({
                            where: {
                                propertyKey,
                                finalTypeId: parseInt(finalTypeId),
                                dataType: 'FILE'
                            }
                        });

                        if (property) {
                            // إنشاء كائن معلومات الملف
                            const fileInfo = {
                                originalName: uploadedFile.originalname,
                                fileName: uploadedFile.filename,
                                filePath: uploadedFile.path,
                                mimeType: uploadedFile.mimetype,
                                size: uploadedFile.size,
                                uploadDate: new Date().toISOString()
                            };

                            // حفظ معلومات الملف في propertyValue
                            await tx.propertyValue.create({
                                data: {
                                    realEstateId: realEstate.id,
                                    propertyId: property.id,
                                    value: JSON.stringify(fileInfo)
                                }
                            });

                            console.log(`✅ Added FILE property: ${propertyKey} -> ${uploadedFile.filename}`);
                        } else {
                            console.warn(`⚠️ Property '${propertyKey}' not found or not of type FILE for finalTypeId: ${finalTypeId}`);
                        }
                    }

                    console.log(`✅ Processed ${Object.keys(propertyFiles).length} property files`);
                }

                return realEstate;
            });

            console.log('✅ Transaction completed successfully');

            // إرجاع الاستجابة النهائية
            const response = {
                success: true,
                data: {
                    id: result.id,
                    title: result.title,
                    price: result.price,
                    coverImageUrl: buildRealEstateFileUrl(coverImage),
                    additionalFilesCount: files.length,
                    companyId: parseInt(finalCompanyId),
                    companyName: company.companyName,
                    createdAt: result.createdAt
                },
                message: 'Real estate listing created successfully on server'
            };

            console.log('✅ Sending success response');
            res.status(201).json(response);

        } catch (dbError) {
            console.error('❌ Database error:', dbError);
            throw dbError;
        }
        
    } catch (error) {
        console.error('❌ Error in addRealEstate (server):', error);
        
        // تنظيف الملفات في حالة خطأ
        if (req.files?.coverImage?.[0]) {
            try {
                await deleteFileFromDisk(req.files.coverImage[0].path);
                console.log('🗑️ Cleaned up cover image');
            } catch (cleanupError) {
                console.warn('Could not cleanup cover image:', cleanupError.message);
            }
        }
        
        if (req.files?.files) {
            for (const file of req.files.files) {
                try {
                    await deleteFileFromDisk(file.path);
                } catch (cleanupError) {
                    console.warn('Could not cleanup file:', cleanupError.message);
                }
            }
            console.log('🗑️ Cleaned up additional files');
        }
        
        // تحديد نوع الخطأ
        let errorCode = 'SERVER_ERROR';
        let errorMessage = 'Internal server error occurred';
        
        if (error.code === 'P2002') {
            errorCode = 'DUPLICATE_ENTRY';
            errorMessage = 'Duplicate entry detected';
        } else if (error.code === 'P2003') {
            errorCode = 'FOREIGN_KEY_CONSTRAINT';
            errorMessage = 'Invalid reference to related data';
        } else if (error.code === 'P2025') {
            errorCode = 'RECORD_NOT_FOUND';
            errorMessage = 'Required record not found';
        }
        
        const errorResponse = {
            success: false,
            error: {
                code: errorCode,
                message: errorMessage,
                server: 'production',
                timestamp: new Date().toISOString()
            }
        };
        
        if (process.env.NODE_ENV === 'development') {
            errorResponse.debug = {
                originalError: error.message,
                stack: error.stack
            };
        }
        
        res.status(500).json(errorResponse);
    }
};
// Get my properties - FIXED
const getMyProperties = async (req, res) => {
    try {
        const prisma = dbManager.getPrisma();
        
        const realEstates = await prisma.realEstate.findMany({
            where: { companyId: req.user.id },
            include: {
                city: { select: { name: true } },
                neighborhood: { select: { name: true } },
                finalType: { select: { name: true } },
                building: { select: { title: true } },
                buildingItem: { select: { name: true } },
                files: { select: { name: true } },
                _count: {
                    select: { Reservation: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        const formattedRealEstates = realEstates.map(realEstate => ({
            ...realEstate,
            coverImage: buildRealEstateFileUrl(realEstate.coverImage),
            files: realEstate.files.map(f => buildRealEstateFileUrl(f.name)),
            reservationsCount: realEstate._count.Reservation
        }));
        
        res.json(formattedRealEstates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get real estate by building item ID - FIXED
const getRealEstateByBuildingItemId = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ 
                error: 'Missing ID parameter',
                message: 'Building item ID is required' 
            });
        }

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
                company: { 
                    select: { 
                        id: true, 
                        companyName: true, 
                        phone: true,
                        email: true
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
                let processedValue = pv.value;
                let fileUrl = null;

                // معالجة خاصة للخصائص من نوع FILE
                if (pv.property.dataType === 'FILE') {
                    try {
                        const fileInfo = JSON.parse(pv.value);
                        // استخراج رابط الملف
                        fileUrl = require('../config/upload').buildPropertyFileUrl(pv.property.propertyKey, fileInfo.fileName);
                        processedValue = fileUrl; // وضع الرابط في value
                    } catch (parseError) {
                        console.warn('Failed to parse FILE property:', pv.property.propertyKey, parseError.message);
                        processedValue = pv.value;
                    }
                }

                propertyValuesObj[pv.property.propertyKey] = {
                    value: processedValue,
                    url: fileUrl, // إضافة url منفصل
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
                companyId: realEstate.companyId,
                companyName: realEstate.company?.companyName || null,
                companyPhone: realEstate.company?.phone || null,
                cityId: realEstate.cityId,
                viewTime: realEstate.viewTime,
                neighborhoodId: realEstate.neighborhoodId,
                price: realEstate.price,
                title: realEstate.title,
                paymentMethod: realEstate.paymentMethod,
                mainCategoryId: realEstate.mainCategoryId,
                subCategoryId: realEstate.subCategoryId,
                advertiserType: realEstate.advertiserType || "user",
                advertiserName: realEstate.advertiserName || "",
                advertiserPhone: realEstate.advertiserPhone || "",
                advertiserWhatsapp: realEstate.advertiserWhatsapp || "",
                coverImage: buildRealEstateFileUrl(realEstate.coverImage),
                finalTypeId: realEstate.finalTypeId,
                buildingId: realEstate.buildingId,
                buildingItemId: realEstate.buildingItemId,
                location: realEstate.location,
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

// Get similar real estate - FIXED
const getRealEstateSimilar = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ 
                error: 'Invalid or missing ID parameter',
                message: 'ID must be a valid number' 
            });
        }

        const prisma = dbManager.getPrisma();

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

        const similarRealEstates = await prisma.realEstate.findMany({
            where: {
                AND: [
                    { id: { not: parseInt(id) } },
                    {
                        OR: [
                            { finalTypeId: realEstate.finalTypeId },
                            { subCategoryId: realEstate.subCategoryId },
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
                company: { 
                    select: { 
                        id: true, 
                        companyName: true 
                    } 
                },
                files: { select: { id: true, name: true } }
            },
            take: 20
        });

        const scoredResults = similarRealEstates.map(item => {
            let score = 0;
            
            if (item.finalTypeId === realEstate.finalTypeId) score += 30;
            if (item.subCategoryId === realEstate.subCategoryId) score += 20;
            if (item.mainCategoryId === realEstate.mainCategoryId) score += 10;
            if (item.cityId === realEstate.cityId) score += 15;
            if (item.neighborhoodId === realEstate.neighborhoodId) score += 10;
            
            const priceDiff = Math.abs(item.price - realEstate.price) / realEstate.price;
            if (priceDiff < 0.2) score += 5;

            return { 
                ...item, 
                companyName: item.company?.companyName || null,
                coverImage: buildRealEstateFileUrl(item.coverImage),
                files: item.files.map(f => buildRealEstateFileUrl(f.name)),
                similarityScore: score 
            };
        });

        const sortedResults = scoredResults
            .sort((a, b) => {
                if (b.similarityScore !== a.similarityScore) {
                    return b.similarityScore - a.similarityScore;
                }
                return new Date(b.createdAt) - new Date(a.createdAt);
            })
            .slice(0, 10);

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

// Delete real estate - FIXED
const deleteRealEstate = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ 
                error: 'Invalid or missing ID parameter',
                message: 'ID must be a valid number' 
            });
        }

        const prisma = dbManager.getPrisma();

        const realEstate = await prisma.realEstate.findUnique({
            where: { id: parseInt(id) },
            include: { files: true }
        });

        if (!realEstate) {
            return res.status(404).json({ message: 'Real estate not found' });
        }

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

// Update real estate - FIXED
const updateRealEstate = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ 
                error: 'Invalid or missing ID parameter',
                message: 'ID must be a valid number' 
            });
        }

        const { properties, files: newFiles, ...updateData } = req.body;

        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined || updateData[key] === '') {
                delete updateData[key];
            }
        });

        ['price', 'cityId', 'neighborhoodId', 'mainCategoryId', 'subCategoryId', 
         'finalTypeId', 'finalCityId'].forEach(field => {
            if (field in updateData && updateData[field] !== null) {
                updateData[field] = parseInt(updateData[field]);
            }
        });

        const prisma = dbManager.getPrisma();

        const result = await prisma.$transaction(async (tx) => {
            let updatedRealEstate = null;
            if (Object.keys(updateData).length > 0) {
                updatedRealEstate = await tx.realEstate.update({
                    where: { id: parseInt(id) },
                    data: updateData
                });
            }

            if (newFiles && Array.isArray(newFiles) && newFiles.length > 0) {
                await tx.file.deleteMany({
                    where: { realestateId: parseInt(id) }
                });

                await tx.file.createMany({
                    data: newFiles.map(fileName => ({
                        name: fileName,
                        realestateId: parseInt(id)
                    }))
                });
            }

            if (properties && typeof properties === 'object') {
                const realEstate = await tx.realEstate.findUnique({
                    where: { id: parseInt(id) },
                    select: { finalTypeId: true }
                });

                if (realEstate) {
                    await tx.propertyValue.deleteMany({
                        where: { realEstateId: parseInt(id) }
                    });

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

// Delete file - ✅ إعادة تسمية لتجنب التضارب
const deleteFileFromDB = async (req, res) => {
    try {
        const { name } = req.params;
        const prisma = dbManager.getPrisma();

        const deletedFiles = await prisma.file.deleteMany({
            where: { name }
        });

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
        buildingId: true,
        buildingItemId: true,
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
    deleteFile: deleteFileFromDB,
    filter,
    getMyProperties,
    upload
};