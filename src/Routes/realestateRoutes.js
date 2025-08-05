const express = require('express');
const router = express.Router();
const realestateController = require('../controllers/realestateController');
const authMiddleware = require('../middleware/auth');
const { requireAuth, requireRole, requirePropertyOwnership } = authMiddleware;

console.log('🔐 Auth middleware imported:', {
    requireAuth: typeof requireAuth,
    requireRole: typeof requireRole,
    requirePropertyOwnership: typeof requirePropertyOwnership
});

console.log('🛣️ Real estate routes loaded');
console.log('Available middleware:', { requireAuth: !!requireAuth, requireRole: !!requireRole, requirePropertyOwnership: !!requirePropertyOwnership });

// ✅ إضافة middleware للتعقب
const trackMiddleware = (name) => (req, res, next) => {
    console.log(`🔄 Middleware executed: ${name}`);
    console.log(`📝 Request URL: ${req.method} ${req.url}`);
    console.log(`👤 User object:`, req.user);
    next();
};

router.get('/', realestateController.getAllRealEstate);

// ✅ إضافة endpoint للاختبار
router.get('/test-auth', 
    trackMiddleware('Test Auth Start'),
    requireAuth, 
    trackMiddleware('Test Auth After Auth'),
    (req, res) => {
        console.log('🧪 Test auth endpoint called');
        console.log('User:', req.user);
        res.json({
            success: true,
            message: 'Authentication working',
            user: req.user
        });
    }
);

// ✅ إضافة endpoint للاختبار بدون auth
router.get('/test-no-auth', 
    trackMiddleware('Test No Auth'),
    (req, res) => {
        console.log('🧪 Test no-auth endpoint called');
        console.log('Headers:', req.headers);
        res.json({
            success: true,
            message: 'No auth endpoint working',
            headers: req.headers
        });
    }
);

// ✅ إضافة endpoint للتحقق من الإعدادات
router.get('/test-config', (req, res) => {
    res.json({
        success: true,
        message: 'Configuration check',
        env: {
            NODE_ENV: process.env.NODE_ENV,
            JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
            JWT_SECRET_LENGTH: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
        }
    });
});

router.get('/:id', realestateController.getRealEstateById);
router.get('/items/:id', realestateController.getRealEstateByBuildingItemId);
router.get('/similar/:id', realestateController.getRealEstateSimilar);

// ✅ إضافة endpoint للاختبار مع auth بدون multer
router.post('/test-post-auth', 
    trackMiddleware('Test Post Auth Start'),
    requireAuth, 
    trackMiddleware('Test Post Auth After Auth'),
    requireRole(['admin', 'company']), 
    trackMiddleware('Test Post Auth After Role'),
    (req, res) => {
        console.log('🧪 Test post auth endpoint called');
        console.log('User:', req.user);
        console.log('Body:', req.body);
        res.json({
            success: true,
            message: 'Post auth endpoint working',
            user: req.user,
            body: req.body
        });
    }
);

router.get('/my-properties', requireAuth, requireRole(['company']), realestateController.getMyProperties);

// ✅ إضافة middleware للتحقق من وجود المستخدم بعد multer
const checkUserAfterUpload = (req, res, next) => {
    console.log('🔍 Checking user after upload middleware');
    console.log('req.user after upload:', req.user);
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);
    
    if (!req.user) {
        console.error('❌ User object lost after upload middleware');
        return res.status(401).json({
            success: false,
            error: { code: 'USER_LOST', message: 'User authentication lost during file upload' }
        });
    }
    
    next();
};

router.post('/', 
    (req, res, next) => {
        console.log('🚀 POST / route handler called');
        console.log('Request method:', req.method);
        console.log('Request URL:', req.url);
        console.log('Request headers:', req.headers);
        next();
    },
    trackMiddleware('Route Start'),
    (req, res, next) => {
        console.log('🔐 About to call requireAuth middleware');
        next();
    },
    requireAuth, 
    (req, res, next) => {
        console.log('🔐 requireAuth middleware completed');
        console.log('req.user after requireAuth:', req.user);
        next();
    },
    trackMiddleware('After Auth'),
    requireRole(['admin', 'company']), 
    trackMiddleware('After Role Check'),
    trackMiddleware('Before Upload'),
    realestateController.upload.fields([
        { name: 'coverImage', maxCount: 1 },
        { name: 'files', maxCount: 10 }
    ]),
    trackMiddleware('After Upload'),
    checkUserAfterUpload,
    trackMiddleware('Before Controller'),
    realestateController.addRealEstate
);

router.delete('/:id', requireAuth, requirePropertyOwnership, realestateController.deleteRealEstate);
router.delete('/deleteFile/:name', requireAuth, requireRole(['admin', 'company']), realestateController.deleteFile);
router.post('/filter', realestateController.filter);
router.put('/:id', requireAuth, requirePropertyOwnership, realestateController.updateRealEstate);

module.exports = router;
