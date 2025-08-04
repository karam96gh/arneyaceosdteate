const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const PORT = process.env.PORT || 4002;
const app = express();

// ✅ إستيراد النظام الموحد لقاعدة البيانات
const { dbManager } = require('./config/database');
const { uploadErrorHandler, checkDiskSpace, UPLOAD_PATHS } = require('./config/upload');

// ✅ التأكد من إنشاء المجلدات المطلوبة
const ensureDirectories = () => {
    const requiredDirs = [
        'uploads',
        'uploads/realestate',
        'uploads/icons', 
        'uploads/properties',
        'uploads/general',
        'src/images',
        'src/controllers/src/images'
    ];

    requiredDirs.forEach(dir => {
        const fullPath = path.join(__dirname, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        }
    });
};

// إنشاء المجلدات عند بدء التطبيق
ensureDirectories();

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
const authRoutes = require('./routes/authRoutes');
const reservationsRoutes = require('./routes/reservationsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
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

// ✅ تطبيق middleware فحص مساحة القرص قبل uploads
app.use('/api/realestate', checkDiskSpace);
app.use('/images', checkDiskSpace);

// 🔧 ===============================================================
// ✅ STATIC FILES ROUTES - يجب أن تكون قبل API Routes
// 🔧 ===============================================================

console.log('🔧 Setting up static file routes...');

// ✅ مسار مخصص للملف المحدد أولاً (أولوية عالية جداً)
app.get('/src/controllers/src/images/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'src/controllers/src/images', filename);
    
    console.log(`🔍 Direct route: Looking for ${filename} at ${filePath}`);
    
    // التحقق من وجود الملف
    if (fs.existsSync(filePath)) {
        console.log(`✅ File found via direct route: ${filename}`);
        res.sendFile(filePath);
    } else {
        console.log(`❌ File not found via direct route: ${filename}`);
        // البحث في مواقع أخرى
        const alternatives = [
            { path: path.join(__dirname, 'uploads/realestate', filename), url: `/uploads/realestate/${filename}` },
            { path: path.join(__dirname, 'src/images', filename), url: `/images/${filename}` }
        ];
        
        for (const alt of alternatives) {
            if (fs.existsSync(alt.path)) {
                console.log(`✅ Found alternative for ${filename}: ${alt.path}`);
                return res.redirect(301, alt.url);
            }
        }
        
        res.status(404).json({
            error: 'File not found',
            filename,
            searchedPaths: [filePath, ...alternatives.map(a => a.path)],
            message: `File ${filename} not found in any location`
        });
    }
});

// ✅ مسار عام للتحقق من الملفات
app.get('/check-file/:filename', (req, res) => {
    const { filename } = req.params;
    const BASE_URL = 'http://62.171.153.198:4002';
    
    const locations = [
        {
            path: path.join(__dirname, 'uploads/realestate', filename),
            url: `${BASE_URL}/uploads/realestate/${filename}`,
            name: 'New Location'
        },
        {
            path: path.join(__dirname, 'src/controllers/src/images', filename),
            url: `${BASE_URL}/src/controllers/src/images/${filename}`,
            name: 'Legacy Nested'
        },
        {
            path: path.join(__dirname, 'src/images', filename),
            url: `${BASE_URL}/images/${filename}`,
            name: 'Legacy Simple'
        }
    ];
    
    const results = locations.map(loc => ({
        ...loc,
        exists: fs.existsSync(loc.path),
        size: fs.existsSync(loc.path) ? fs.statSync(loc.path).size : 0
    }));
    
    const found = results.find(r => r.exists);
    
    res.json({
        filename,
        found: !!found,
        workingUrl: found?.url,
        location: found?.name,
        allResults: results,
        timestamp: new Date().toISOString()
    });
});

// ✅ مسارات الملفات الثابتة بالترتيب الصحيح
// الأكثر تحديداً أولاً

// 1. المسارات المتداخلة العميقة (أولوية عالية)
app.use('/src/controllers/src/images', express.static(path.join(__dirname, 'src/controllers/src/images'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        console.log(`📁 Serving legacy nested: ${path.basename(filePath)}`);
    }
}));

// 2. المسارات الجديدة
app.use('/uploads/realestate', express.static(path.join(__dirname, 'uploads/realestate'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        console.log(`📁 Serving new: ${path.basename(filePath)}`);
    }
}));

app.use('/uploads/icons', express.static(path.join(__dirname, 'uploads/icons'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

app.use('/uploads/properties', express.static(path.join(__dirname, 'uploads/properties'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

app.use('/uploads/general', express.static(path.join(__dirname, 'uploads/general'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// 3. مسارات متوسطة التحديد
app.use('/controllers/src/images', express.static(path.join(__dirname, 'src/controllers/src/images'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

app.use('/images/products', express.static(path.join(__dirname, 'src/images/products'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

app.use('/images/properties', express.static(path.join(__dirname, 'src/controllers/src/images/properties'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

app.use('/src/images', express.static(path.join(__dirname, 'src/images'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// 4. المسارات العامة (الأقل تحديداً)
app.use('/images', express.static(path.join(__dirname, 'src/images'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

console.log('✅ Static routes configured successfully');

// 🔧 ===============================================================
// ✅ API ROUTES - بعد Static Files
// 🔧 ===============================================================

// ✅ API Routes التشخيصية أولاً
app.get('/api/files/check/:filename', (req, res) => {
    const { filename } = req.params;
    const BASE_URL = 'http://62.171.153.198:4002';
    
    const searchPaths = [
        {
            path: path.join(__dirname, 'uploads/realestate', filename),
            url: `${BASE_URL}/uploads/realestate/${filename}`,
            type: 'new'
        },
        {
            path: path.join(__dirname, 'src/controllers/src/images', filename),
            url: `${BASE_URL}/src/controllers/src/images/${filename}`,
            type: 'legacy-nested'
        },
        {
            path: path.join(__dirname, 'src/images', filename),
            url: `${BASE_URL}/images/${filename}`,
            type: 'legacy-simple'
        }
    ];
    
    const results = searchPaths.map(sp => ({
        ...sp,
        exists: fs.existsSync(sp.path)
    }));
    
    const foundFile = results.find(r => r.exists);
    
    res.json({
        filename,
        found: !!foundFile,
        correctUrl: foundFile?.url,
        fileType: foundFile?.type,
        allResults: results,
        testUrls: results.map(r => r.url)
    });
});

app.get('/api/files/check/:type/:filename', (req, res) => {
    const { type, filename } = req.params;
    
    const checkPaths = [
        path.join(__dirname, `uploads/${type}`, filename),
        path.join(__dirname, 'src/images', filename),
        path.join(__dirname, 'src/controllers/src/images', filename)
    ];
    
    const results = checkPaths.map(filePath => ({
        path: filePath,
        exists: fs.existsSync(filePath),
        url: filePath.replace(__dirname, `http://62.171.153.198:4002`)
            .replace(/\\/g, '/')
            .replace('/src/', '/')
            .replace('/controllers/', '/')
    }));
    
    res.json({
        filename,
        type,
        results,
        found: results.some(r => r.exists)
    });
});

// ✅ API Routes الرئيسية
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
app.use('/api/auth', authRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
// File upload routes
app.use('/images', require('./routes/uploadImage'));
app.use('/api', require('./routes/upload_file'));

// ✅ Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await dbManager.healthCheck();
        const uploadStats = {};
        
        Object.entries(UPLOAD_PATHS).forEach(([type, path]) => {
            try {
                uploadStats[type.toLowerCase()] = {
                    path: path,
                    exists: require('fs').existsSync(path)
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
            environment: process.env.NODE_ENV || 'development'
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

// ✅ API info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Real Estate API',
        version: '2.2.0', // تحديث رقم الإصدار
        description: 'Real Estate Management System API with Authentication & Reservations',
        endpoints: {
            // المسارات الموجودة
            cities: '/api/cities',
            neighborhoods: '/api/neighborhoods',
            finalCities: '/api/finalCity',
            realEstate: '/api/realestate',
            properties: '/api/properties',
            buildings: '/api/buildings',
            files: '/api/files',
            
            // المسارات الجديدة
            auth: '/api/auth',
            reservations: '/api/reservations',
            dashboard: '/api/dashboard'
        },
        authEndpoints: {
            login: 'POST /api/auth/login',
            register: 'POST /api/auth/register',
            profile: 'GET /api/auth/me',
            users: 'GET /api/auth/users (Admin only)',
            updateUser: 'PUT /api/auth/users/:id (Admin only)',
            changePassword: 'POST /api/auth/change-password',
            resetPassword: 'POST /api/auth/reset-password (Admin only)'
        },
        reservationEndpoints: {
            create: 'POST /api/reservations',
            getAll: 'GET /api/reservations (Admin/Company)',
            getUserReservations: 'GET /api/reservations/user',
            update: 'PUT /api/reservations/:id',
            delete: 'DELETE /api/reservations/:id',
            stats: 'GET /api/reservations/stats (Admin/Company)'
        },
        dashboardEndpoints: {
            stats: 'GET /api/dashboard/stats (Admin/Company)'
        }
    });
});

// ✅ Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        if (!req.path.startsWith('/api/') && !req.path.startsWith('/health')) {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        }
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
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ 
            error: 'Invalid JSON format',
            message: 'Request body contains invalid JSON'
        });
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
            error: 'File size too large',
            message: 'The uploaded file exceeds the maximum allowed size'
        });
    }
    
    if (err.code === 'P1001' || err.code === 'P1003') {
        return res.status(503).json({
            error: 'Database connection error',
            message: 'Unable to connect to the database'
        });
    }
    
    res.status(err.statusCode || 500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ✅ 404 handler (يجب أن يكون الأخير)
app.use('*', (req, res) => {
    // إذا كان المسار يحتوي على ملف صورة، قدم اقتراحات
    const isImageRequest = /\.(jpg|jpeg|png|gif|webp|mp4)$/i.test(req.originalUrl);
    
    if (isImageRequest) {
        const filename = path.basename(req.originalUrl);
        return res.status(404).json({
            error: 'Image file not found',
            message: `Cannot ${req.method} ${req.originalUrl}`,
            filename,
            suggestions: [
                `http://62.171.153.198:4002/uploads/realestate/${filename}`,
                `http://62.171.153.198:4002/src/controllers/src/images/${filename}`,
                `http://62.171.153.198:4002/images/${filename}`
            ],
            checkUrl: `http://62.171.153.198:4002/check-file/${filename}`,
            apiCheckUrl: `http://62.171.153.198:4002/api/files/check/${filename}`
        });
    }
    
    res.status(404).json({ 
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        availableRoutes: {
            api: '/api',
            health: '/health',
            uploads: '/uploads',
            images: '/images',
            legacyImages: '/src/controllers/src/images'
        }
    });
});

// ✅ Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    
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
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception thrown:', error);
    process.exit(1);
});

// ✅ بدء الخادم
const startServer = async () => {
    try {
        await dbManager.initialize();
        
        const server = app.listen(PORT, () => {
            console.log('🚀 ================================================');
            console.log(`🏠 Real Estate API Server Started Successfully!`);
            console.log(`📡 Port: ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('');
            console.log('📊 Available Endpoints:');
            console.log(`   Health: http://localhost:${PORT}/health`);
            console.log(`   API Info: http://localhost:${PORT}/api`);
            console.log('');
            console.log('📁 File Routes:');
            console.log(`   New files: http://localhost:${PORT}/uploads/realestate/`);
            console.log(`   Legacy files: http://localhost:${PORT}/src/controllers/src/images/`);
            console.log(`   General files: http://localhost:${PORT}/images/`);
            console.log('');
            console.log('🔍 File Diagnostics:');
            console.log(`   Simple check: http://localhost:${PORT}/check-file/{filename}`);
            console.log(`   API check: http://localhost:${PORT}/api/files/check/{filename}`);
            console.log('');
            console.log('🧪 Test URLs:');
            console.log(`   Working: http://localhost:${PORT}/uploads/realestate/1750203930959-realestate.png`);
            console.log(`   Problem: http://localhost:${PORT}/src/controllers/src/images/1750239027927.jpg`);
            console.log('🚀 ================================================');
        });

        server.timeout = 30000;
        return server;
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = app;