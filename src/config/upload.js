// src/config/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ BASE_URL ثابت
const BASE_URL = 'http://localhost:4002';

// ✅ تعريف مسارات موحدة
const UPLOAD_PATHS = {
    REALESTATE: path.join(__dirname, '../uploads/realestate/'),
    ICONS: path.join(__dirname, '../uploads/icons/'),
    PROPERTIES: path.join(__dirname, '../uploads/properties/'),
    GENERAL: path.join(__dirname, '../uploads/general/')
};

// ✅ إنشاء المجلدات تلقائياً
Object.values(UPLOAD_PATHS).forEach(uploadPath => {
    fs.mkdirSync(uploadPath, { recursive: true });
});

// ✅ أنواع الملفات المسموحة
const ALLOWED_TYPES = {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'],
    VIDEOS: ['video/mp4', 'video/avi', 'video/mov'],
    DOCUMENTS: ['application/pdf', 'application/doc', 'application/docx']
};

// ✅ دوال بناء المسارات الكاملة
const buildRealEstateFileUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    return `${BASE_URL}/uploads/realestate/${filename}`;
};

const buildIconUrl = (filename) => {
    if (!filename) return `${BASE_URL}/uploads/icons/icon.png`;
    if (filename === 'icon.png') return `${BASE_URL}/uploads/icons/icon.png`;
    if (filename.startsWith('http')) return filename;
    return `${BASE_URL}/src/controllers/src/images/${filename}`;
};

const buildPropertyFileUrl = (propertyKey, filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    return `${BASE_URL}/images/properties/${propertyKey}/${filename}`;
};

const buildGeneralFileUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    return `${BASE_URL}/uploads/general/${filename}`;
};

// ✅ إنشاء storage مخصص
const createStorage = (uploadType, subfolder = '') => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            let uploadPath = UPLOAD_PATHS[uploadType];
            
            if (subfolder) {
                uploadPath = path.join(uploadPath, subfolder);
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            try {
                const fileExtension = path.extname(file.originalname);
                const timestamp = Date.now();
                const uniqueName = `${timestamp}-${uploadType.toLowerCase()}${fileExtension}`;
                cb(null, uniqueName);
            } catch (err) {
                console.error('Error generating filename:', err);
                cb(err);
            }
        }
    });
};

// ✅ إنشاء file filter مخصص
const createFileFilter = (allowedTypes) => {
    return (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
        }
    };
};

// ✅ إعدادات Multer موحدة
const createUploadMiddleware = (uploadType, allowedTypes, maxSize = 5 * 1024 * 1024) => {
    return multer({
        storage: createStorage(uploadType),
        fileFilter: createFileFilter(allowedTypes),
        limits: {
            fileSize: maxSize,
            files: 10 // حد أقصى 10 ملفات
        }
    });
};

// ✅ Middleware للأنواع المختلفة
const uploadMiddlewares = {
    // للعقارات - صور وفيديوهات
    realEstate: createUploadMiddleware(
        'REALESTATE',
        [...ALLOWED_TYPES.IMAGES, ...ALLOWED_TYPES.VIDEOS],
        10 * 1024 * 1024 // 10MB
    ),
    
    // للأيقونات - صور فقط
    icons: createUploadMiddleware(
        'ICONS',
        ALLOWED_TYPES.IMAGES,
        2 * 1024 * 1024 // 2MB
    ),
    
    // للخصائص - جميع الأنواع
    properties: createUploadMiddleware(
        'PROPERTIES',
        [...ALLOWED_TYPES.IMAGES, ...ALLOWED_TYPES.VIDEOS, ...ALLOWED_TYPES.DOCUMENTS],
        15 * 1024 * 1024 // 15MB
    ),
    
    // عام - صور فقط
    general: createUploadMiddleware(
        'GENERAL',
        ALLOWED_TYPES.IMAGES,
        5 * 1024 * 1024 // 5MB
    )
};

// ✅ دالة حذف الملفات
const deleteFile = async (filePath) => {
    try {
        // التحقق من صحة المسار
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Invalid file path');
        }

        // التحقق من وجود الملف
        await fs.promises.access(filePath, fs.constants.F_OK);
        
        // حذف الملف
        await fs.promises.unlink(filePath);
        
        console.log(`✅ File deleted successfully: ${filePath}`);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`⚠️ File not found: ${filePath}`);
            return false;
        }
        console.error(`❌ Error deleting file ${filePath}:`, error);
        throw error;
    }
};

// ✅ دالة تنظيف الملفات القديمة
const cleanupOldFiles = (directory, maxAgeInDays = 30) => {
    try {
        const files = fs.readdirSync(directory);
        const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000; // تحويل إلى milliseconds
        let deletedCount = 0;

        files.forEach(file => {
            const filePath = path.join(directory, file);
            const stats = fs.statSync(filePath);
            
            if (Date.now() - stats.mtime.getTime() > maxAge) {
                if (deleteFile(filePath)) {
                    deletedCount++;
                }
            }
        });

        console.log(`🧹 Cleaned up ${deletedCount} old files from ${directory}`);
        return deletedCount;
    } catch (error) {
        console.error(`❌ Error during cleanup:`, error);
        return 0;
    }
};

// ✅ دالة التحقق من حجم المجلد
const getFolderSize = (directory) => {
    try {
        let totalSize = 0;
        const files = fs.readdirSync(directory);
        
        files.forEach(file => {
            const filePath = path.join(directory, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
        });
        
        return totalSize;
    } catch (error) {
        console.error(`❌ Error calculating folder size:`, error);
        return 0;
    }
};

// ✅ دالة تحويل حجم الملف إلى format قابل للقراءة
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ✅ دالة إنشاء URL للملف (محدثة)
const getFileUrl = (uploadType, filename) => {
    const typeToPath = {
        'REALESTATE': '/uploads/realestate/',
        'ICONS': '/uploads/icons/',
        'PROPERTIES': '/uploads/properties/',
        'GENERAL': '/uploads/general/'
    };
    
    return `${BASE_URL}${typeToPath[uploadType]}${filename}`;
};

// ✅ Middleware للتحقق من مساحة القرص
const checkDiskSpace = (req, res, next) => {
    const totalSize = Object.values(UPLOAD_PATHS)
        .reduce((total, path) => total + getFolderSize(path), 0);
    
    const maxSize = 1024 * 1024 * 1024; // 1GB
    
    if (totalSize > maxSize) {
        return res.status(507).json({
            error: 'Insufficient storage space',
            currentSize: formatFileSize(totalSize),
            maxSize: formatFileSize(maxSize)
        });
    }
    
    next();
};

// ✅ Error handler للملفات
const uploadErrorHandler = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    error: 'File too large',
                    message: 'File size exceeds the allowed limit'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    error: 'Too many files',
                    message: 'Number of files exceeds the allowed limit'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    error: 'Unexpected file field',
                    message: 'Unexpected file field name'
                });
            default:
                return res.status(400).json({
                    error: 'Upload error',
                    message: error.message
                });
        }
    }
    
    if (error.message.includes('not allowed')) {
        return res.status(400).json({
            error: 'File type not allowed',
            message: error.message
        });
    }
    
    console.error('Upload error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred during file upload'
    });
};

// ✅ جدولة تنظيف الملفات القديمة (كل 24 ساعة)
if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
        Object.entries(UPLOAD_PATHS).forEach(([type, path]) => {
            cleanupOldFiles(path, 30); // حذف الملفات الأقدم من 30 يوم
        });
    }, 24 * 60 * 60 * 1000); // كل 24 ساعة
}

module.exports = {
    // Paths
    UPLOAD_PATHS,
    ALLOWED_TYPES,
    BASE_URL,
    
    // ✅ دوال بناء المسارات الكاملة
    buildRealEstateFileUrl,
    buildIconUrl,
    buildPropertyFileUrl,
    buildGeneralFileUrl,
    
    // Middlewares
    uploadMiddlewares,
    checkDiskSpace,
    uploadErrorHandler,
    
    // Storage creators
    createStorage,
    createFileFilter,
    createUploadMiddleware,
    
    // Utilities
    deleteFile,
    cleanupOldFiles,
    getFolderSize,
    formatFileSize,
    getFileUrl,
    
    // Legacy support (للتوافق مع الكود القديم)
    upload: uploadMiddlewares.realEstate
};