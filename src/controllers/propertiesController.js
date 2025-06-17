const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../config/prisma');
const { getPropertyFileUrl } = require('../config/upload');

// إعداد تخزين الملفات للخصائص
const createPropertyFileStorage = (propertyKey) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(__dirname, `src/images/properties/${propertyKey}/`);
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const fileExtension = path.extname(file.originalname);
            const uniqueName = `${Date.now()}-${propertyKey}${fileExtension}`;
            cb(null, uniqueName);
        }
    });
};

// فلتر للتحقق من نوع الملف
const createFileFilter = (allowedConfig) => {
    return (req, file, cb) => {
        try {
            const config = typeof allowedConfig === 'string' 
                ? JSON.parse(allowedConfig) 
                : allowedConfig;

            let isAllowed = false;

            // فحص الامتدادات المسموحة
            if (config.extensions && Array.isArray(config.extensions)) {
                const fileExt = path.extname(file.originalname).toLowerCase();
                isAllowed = config.extensions.some(ext => 
                    fileExt === (ext.startsWith('.') ? ext : `.${ext}`)
                );
            }

            // فحص أنواع MIME المسموحة
            if (!isAllowed && config.mimeTypes && Array.isArray(config.mimeTypes)) {
                isAllowed = config.mimeTypes.includes(file.mimetype);
            }

            if (isAllowed) {
                cb(null, true);
            } else {
                cb(new Error(`File type not allowed. Allowed types: ${JSON.stringify(config)}`), false);
            }
        } catch (error) {
            cb(new Error('Invalid file configuration'), false);
        }
    };
};

// رفع ملف لخاصية معينة
const uploadPropertyFile = async (req, res) => {
    try {
        const { propertyId, realEstateId } = req.params;

        // الحصول على معلومات الخاصية
        const property = await prisma.property.findUnique({
            where: { id: parseInt(propertyId) }
        });

        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        if (property.dataType !== 'file') {
            return res.status(400).json({ message: 'Property is not a file type' });
        }

        // إعداد multer للخاصية المحددة
        const storage = createPropertyFileStorage(property.propertyKey);
        const fileFilter = createFileFilter(property.allowedValues);
        
        const upload = multer({ 
            storage,
            fileFilter,
            limits: {
                fileSize: 10 * 1024 * 1024 // 10MB افتراضي
            }
        }).single('file');

        // رفع الملف
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            try {
                // حفظ معلومات الملف في قاعدة البيانات
                const fileInfo = {
                    originalName: req.file.originalname,
                    fileName: req.file.filename,
                    filePath: req.file.path,
                    mimeType: req.file.mimetype,
                    size: req.file.size,
                    uploadDate: new Date()
                };

                // حفظ قيمة الخاصية
                await prisma.propertyValue.upsert({
                    where: {
                        realEstateId_propertyId: {
                            realEstateId: parseInt(realEstateId),
                            propertyId: parseInt(propertyId)
                        }
                    },
                    update: {
                        value: JSON.stringify(fileInfo)
                    },
                    create: {
                        realEstateId: parseInt(realEstateId),
                        propertyId: parseInt(propertyId),
                        value: JSON.stringify(fileInfo)
                    }
                });

                // ✅ إضافة الرابط في الاستجابة
                res.status(200).json({
                    message: 'File uploaded successfully',
                    fileInfo: {
                        fileName: req.file.filename,
                        originalName: req.file.originalname,
                        size: req.file.size,
                        mimeType: req.file.mimetype,
                        uploadDate: fileInfo.uploadDate,
                        // ✅ الرابط الكامل للملف
                        downloadUrl: getPropertyFileUrl(property.propertyKey, req.file.filename, req),
                        // ✅ المسار النسبي (للتوافق مع النظام القديم)
                        path: `/images/properties/${property.propertyKey}/${req.file.filename}`
                    }
                });
            } catch (dbError) {
                // حذف الملف في حالة خطأ قاعدة البيانات
                fs.unlinkSync(req.file.path);
                res.status(500).json({ error: dbError.message });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// حذف ملف خاصية
const deletePropertyFile = async (req, res) => {
    try {
        const { propertyId, realEstateId } = req.params;

        // الحصول على قيمة الخاصية
        const propertyValue = await prisma.propertyValue.findUnique({
            where: {
                realEstateId_propertyId: {
                    realEstateId: parseInt(realEstateId),
                    propertyId: parseInt(propertyId)
                }
            },
            include: {
                property: { select: { propertyKey: true, dataType: true } }
            }
        });

        if (!propertyValue) {
            return res.status(404).json({ message: 'Property value not found' });
        }

        if (propertyValue.property.dataType !== 'file') {
            return res.status(400).json({ message: 'Property is not a file type' });
        }

        try {
            const fileInfo = JSON.parse(propertyValue.value);
            const filePath = path.join(__dirname, `src/images/properties/${propertyValue.property.propertyKey}/${fileInfo.fileName}`);

            // حذف الملف من النظام
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // حذف قيمة الخاصية من قاعدة البيانات
            await prisma.propertyValue.delete({
                where: {
                    realEstateId_propertyId: {
                        realEstateId: parseInt(realEstateId),
                        propertyId: parseInt(propertyId)
                    }
                }
            });

            res.status(200).json({ 
                message: 'File deleted successfully',
                deletedFile: fileInfo.fileName
            });
        } catch (parseError) {
            // إذا كانت البيانات تالفة، احذف القيمة على الأقل
            await prisma.propertyValue.delete({
                where: {
                    realEstateId_propertyId: {
                        realEstateId: parseInt(realEstateId),
                        propertyId: parseInt(propertyId)
                    }
                }
            });
            res.status(200).json({ message: 'Property value deleted (file data was corrupted)' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// الحصول على معلومات ملف خاصية
const getPropertyFileInfo = async (req, res) => {
    try {
        const { propertyId, realEstateId } = req.params;

        const propertyValue = await prisma.propertyValue.findUnique({
            where: {
                realEstateId_propertyId: {
                    realEstateId: parseInt(realEstateId),
                    propertyId: parseInt(propertyId)
                }
            },
            include: {
                property: { 
                    select: { 
                        propertyKey: true, 
                        propertyName: true, 
                        dataType: true 
                    } 
                }
            }
        });

        if (!propertyValue) {
            return res.status(404).json({ message: 'Property value not found' });
        }

        if (propertyValue.property.dataType !== 'file') {
            return res.status(400).json({ message: 'Property is not a file type' });
        }

        try {
            const fileInfo = JSON.parse(propertyValue.value);
            res.status(200).json({
                property: propertyValue.property,
                fileInfo: {
                    ...fileInfo,
                    // ✅ إضافة الرابط الكامل
                    downloadUrl: getPropertyFileUrl(propertyValue.property.propertyKey, fileInfo.fileName, req),
                    // ✅ المسار النسبي (للتوافق)
                    relativePath: `/images/properties/${propertyValue.property.propertyKey}/${fileInfo.fileName}`
                }
            });
        } catch (parseError) {
            res.status(400).json({ message: 'Corrupted file data' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// تحديث ملف خاصية (استبدال)
const updatePropertyFile = async (req, res) => {
    try {
        // حذف الملف القديم أولاً
        const deleteResponse = await new Promise((resolve) => {
            deletePropertyFile(req, {
                status: (code) => ({
                    json: (data) => resolve({ statusCode: code, data })
                })
            });
        });
        
        // إذا تم الحذف بنجاح، رفع الملف الجديد
        if (deleteResponse.statusCode === 200) {
            await uploadPropertyFile(req, res);
        } else {
            res.status(deleteResponse.statusCode).json(deleteResponse.data);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// الحصول على جميع ملفات الخصائص لعقار
const getRealEstatePropertyFiles = async (req, res) => {
    try {
        const { realEstateId } = req.params;

        const propertyValues = await prisma.propertyValue.findMany({
            where: {
                realEstateId: parseInt(realEstateId),
                property: { dataType: 'file' }
            },
            include: {
                property: {
                    select: {
                        id: true,
                        propertyKey: true,
                        propertyName: true,
                        groupName: true
                    }
                }
            }
        });

        const fileProperties = propertyValues.map(pv => {
            try {
                const fileInfo = JSON.parse(pv.value);
                return {
                    propertyId: pv.property.id,
                    propertyKey: pv.property.propertyKey,
                    propertyName: pv.property.propertyName,
                    groupName: pv.property.groupName,
                    fileInfo: {
                        ...fileInfo,
                        // ✅ إضافة الرابط الكامل
                        downloadUrl: getPropertyFileUrl(pv.property.propertyKey, fileInfo.fileName, req),
                        // ✅ المسار النسبي (للتوافق)
                        relativePath: `/images/properties/${pv.property.propertyKey}/${fileInfo.fileName}`
                    }
                };
            } catch (parseError) {
                return {
                    propertyId: pv.property.id,
                    propertyKey: pv.property.propertyKey,
                    propertyName: pv.property.propertyName,
                    groupName: pv.property.groupName,
                    error: 'Corrupted file data'
                };
            }
        });

        res.status(200).json({
            realEstateId: parseInt(realEstateId),
            filePropertiesCount: fileProperties.length,
            fileProperties
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ دالة مساعدة للحصول على جميع ملفات الخصائص مع الروابط (للاستخدام الداخلي)
const getPropertyFilesWithUrls = async (realEstateId, req = null) => {
    try {
        const propertyValues = await prisma.propertyValue.findMany({
            where: {
                realEstateId: parseInt(realEstateId),
                property: { dataType: 'FILE' }
            },
            include: {
                property: {
                    select: {
                        id: true,
                        propertyKey: true,
                        propertyName: true,
                        groupName: true
                    }
                }
            }
        });

        return propertyValues.map(pv => {
            try {
                const fileInfo = JSON.parse(pv.value);
                return {
                    propertyId: pv.property.id,
                    propertyKey: pv.property.propertyKey,
                    propertyName: pv.property.propertyName,
                    groupName: pv.property.groupName,
                    fileInfo: {
                        ...fileInfo,
                        downloadUrl: getPropertyFileUrl(pv.property.propertyKey, fileInfo.fileName, req),
                        relativePath: `/images/properties/${pv.property.propertyKey}/${fileInfo.fileName}`
                    }
                };
            } catch (parseError) {
                return {
                    propertyId: pv.property.id,
                    propertyKey: pv.property.propertyKey,
                    propertyName: pv.property.propertyName,
                    groupName: pv.property.groupName,
                    error: 'Corrupted file data'
                };
            }
        });
    } catch (error) {
        console.error('Error getting property files with URLs:', error);
        return [];
    }
};

module.exports = {
    uploadPropertyFile,
    deletePropertyFile,
    getPropertyFileInfo,
    updatePropertyFile,
    getRealEstatePropertyFiles,
    getPropertyFilesWithUrls,
    createPropertyFileStorage,
    createFileFilter
};