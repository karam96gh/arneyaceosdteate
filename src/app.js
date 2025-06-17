const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 4002;
const app = express();

// ✅ إستيراد النظام الموحد لقاعدة البيانات
const { dbManager } = require('./config/database');
const { uploadErrorHandler, checkDiskSpace, UPLOAD_PATHS } = require('./config/upload');
const { urlHelper } = require('./middleware/urlHelper'); // ✅ إضافة URL Helper

// Import routes
const citiesRoutes = require('./routes/citiesRoutes');
const filesRoutes = require('./routes/filesRoutes');
const maintypeRoutes = require('./routes/maintypeRoutes');
const neighborhoodsRoutes = require('./routes/neighborhoodsRoutes');
const finalCityRoutes = require('./routes/finalCityRoutes');
const realestateRoutes = require('./routes/realestateRoutes');
const subtypeRoutes = require('./routes/subtypeRoutes');
const finalTypeRoutes = require('./routes/finalTypeRoutes');
const buildingRoutes = require('./routes/buildingRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const filePropertyRoutes = require('./routes/filePropertyRoutes');

// ✅ Security middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ✅ Basic security
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ✅ Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Basic middleware
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            throw new Error('Invalid JSON');
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
        : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ إضافة URL Helper middleware قبل المسارات
app.use(urlHelper);

// ✅ تطبيق middleware فحص مساحة القرص قبل uploads
app.use('/api/realestate', checkDiskSpace);
app.use('/images', checkDiskSpace);

// API Routes
app.use('/api/cities', citiesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/maintypes', maintypeRoutes);
app.use('/api/neighborhoods', neighborhoodsRoutes);
app.use('/api/finalCity', finalCityRoutes);
app.use('/api/realestate', realestateRoutes);
app.use('/api/subtypes', subtypeRoutes);
app.use('/api/finaltypes', finalTypeRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/properties', filePropertyRoutes);
app.use('/api', buildingRoutes);

// File upload routes
app.use('/images', require('./routes/uploadImage'));
app.use('/api', require('./routes/upload_file'));

// ✅ Static file serving مع الأمان والروابط المحدثة
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d', // cache للملفات
    etag: true,
    lastModified: true,
    // ✅ إضافة headers للروابط المباشرة
    setHeaders: (res, filePath) => {
        // إضافة CORS headers للملفات
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        
        // تحديد Content-Type حسب نوع الملف
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.pdf': 'application/pdf'
        };
        
        if (mimeTypes[ext]) {
            res.set('Content-Type', mimeTypes[ext]);
        }
    }
}));

// Legacy static paths (للتوافق مع النظام القديم)
app.use(express.static(path.join(__dirname, './controllers/src/images')));
app.use(express.static(path.join(__dirname, './images/products')));
app.use('/images/properties', express.static(path.join(__dirname, './controllers/src/images/properties')));

// ✅ Health check endpoint محسن مع معلومات الروابط
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await dbManager.healthCheck();
        const uploadStats = {};
        
        // فحص مساحة الرفع
        Object.entries(UPLOAD_PATHS).forEach(([type, path]) => {
            try {
                uploadStats[type.toLowerCase()] = {
                    path: path,
                    exists: require('fs').existsSync(path),
                    // ✅ إضافة رابط الوصول للملفات
                    publicUrl: `${req.protocol}://${req.get('host')}/uploads/${type.toLowerCase()}/`
                };
            } catch (error) {
                uploadStats[type.toLowerCase()] = {
                    path: path,
                    exists: false,
                    error: error.message
                };
            }
        });

        res.status(200).json({ 
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'Real Estate API',
            version: '2.1.0',
            database: dbHealth ? 'connected' : 'disconnected',
            uploads: uploadStats,
            environment: process.env.NODE_ENV || 'development',
            // ✅ إضافة معلومات الخادم
            server: {
                baseUrl: `${req.protocol}://${req.get('host')}`,
                uploadsBaseUrl: `${req.protocol}://${req.get('host')}/uploads/`
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            service: 'Real Estate API',
            version: '2.1.0',
            database: 'error',
            error: error.message
        });
    }
});

// ✅ API info endpoint محدث
app.get('/api', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
        name: 'Real Estate API',
        version: '2.1.0',
        description: 'Real Estate Management System API',
        server: {
            baseUrl: baseUrl,
            uploadsUrl: `${baseUrl}/uploads/`,
            timestamp: new Date().toISOString()
        },
        endpoints: {
            cities: '/api/cities',
            neighborhoods: '/api/neighborhoods',
            finalCities: '/api/finalCity',
            realEstate: '/api/realestate',
            properties: '/api/properties',
            buildings: '/api/buildings',
            files: '/api/files',
            maintypes: '/api/maintypes',
            subtypes: '/api/subtypes',
            finaltypes: '/api/finaltypes'
        },
        uploads: {
            realestate: `${baseUrl}/uploads/realestate/`,
            icons: `${baseUrl}/uploads/icons/`,
            properties: `${baseUrl}/uploads/properties/`,
            general: `${baseUrl}/uploads/general/`
        },
        documentation: '/api/docs', // يمكن إضافة Swagger لاحقاً
        health: '/health'
    });
});

// ✅ Request logging middleware محدث
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        console.log(`${timestamp} - ${req.method} ${req.path} - Base URL: ${baseUrl}${req.query ? ` - Query: ${JSON.stringify(req.query)}` : ''}`);
        next();
    });
}

// ✅ Upload error handling
app.use(uploadErrorHandler);

// ✅ Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        baseUrl: `${req.protocol}://${req.get('host')}`,
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    // JSON parsing errors
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ 
            error: 'Invalid JSON format',
            message: 'Request body contains invalid JSON'
        });
    }
    
    // File size errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
            error: 'File size too large',
            message: 'The uploaded file exceeds the maximum allowed size'
        });
    }
    
    // Database connection errors
    if (err.code === 'P1001' || err.code === 'P1003') {
        return res.status(503).json({
            error: 'Database connection error',
            message: 'Unable to connect to the database'
        });
    }
    
    // Default error response
    res.status(err.statusCode || 500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ✅ 404 handler محدث
app.use('*', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.status(404).json({ 
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        server: {
            baseUrl: baseUrl,
            timestamp: new Date().toISOString()
        },
        availableRoutes: {
            api: '/api',
            health: '/health',
            uploads: '/uploads',
            documentation: `${baseUrl}/api`
        }
    });
});

// ✅ Graceful shutdown محسن
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    
    // إغلاق اتصال قاعدة البيانات
    try {
        await dbManager.disconnect();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error closing database connection:', error);
    }
    
    console.log('🔴 Process terminated');
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // for nodemon

// ✅ Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // لا نغلق العملية، فقط نسجل الخطأ
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception thrown:', error);
    process.exit(1);
});

// ✅ بدء الخادم مع إعداد قاعدة البيانات
const startServer = async () => {
    try {
        // تهيئة قاعدة البيانات أولاً
        await dbManager.initialize();
        
        // بدء الخادم
        const server = app.listen(PORT, () => {
            const baseUrl = `http://localhost:${PORT}`;
            console.log('🚀 ================================================');
            console.log(`🏠 Real Estate API Server Started Successfully!`);
            console.log(`📡 Port: ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Base URL: ${baseUrl}`);
            console.log(`📊 Health check: ${baseUrl}/health`);
            console.log(`🏠 API info: ${baseUrl}/api`);
            console.log(`📁 Uploads: ${baseUrl}/uploads`);
            console.log(`🖼️  Real Estate Files: ${baseUrl}/uploads/realestate/`);
            console.log(`🎯 Icons: ${baseUrl}/uploads/icons/`);
            console.log(`📋 Properties: ${baseUrl}/uploads/properties/`);
            console.log('🚀 ================================================');
        });

        // تعيين timeout للطلبات
        server.timeout = 30000; // 30 seconds

        return server;
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// بدء الخادم
if (require.main === module) {
    startServer();
}

module.exports = app;