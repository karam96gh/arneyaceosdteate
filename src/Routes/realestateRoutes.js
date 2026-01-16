// src/routes/realestateRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const realestateController = require('../controllers/realestateController');
const { requireAuth, requireRole, requirePropertyOwnership } = require('../middleware/auth');
const { preserveUserAfterMulter } = require('../middleware/preserveUser');

// GET routes (no auth issues)
router.get('/', realestateController.getAllRealEstate);
router.get('/my-properties', requireAuth, requireRole(['company']), realestateController.getMyProperties);

router.get('/:id', realestateController.getRealEstateById);
router.get('/items/:id', realestateController.getRealEstateByBuildingItemId);
router.get('/similar/:id', realestateController.getRealEstateSimilar);

// ✅ POST route with FIXED middleware order
router.post('/', 
    // تسجيل قبل auth
    (req, res, next) => {
        console.log('🔍 [STEP 1] Before auth - req.user:', !!req.user);
        console.log('🔍 [STEP 1] Auth header:', !!req.headers.authorization);
        next();
    },
    
    // المصادقة
    requireAuth,
    
    // تسجيل بعد auth
    (req, res, next) => {
        console.log('🔍 [STEP 2] After auth - req.user:', !!req.user);
        if (req.user) {
            console.log('🔍 [STEP 2] User details:', { id: req.user.id, role: req.user.role });
        }
        next();
    },
    
    // التحقق من الدور
    requireRole(['admin', 'company']),
    
    // تسجيل بعد role
    (req, res, next) => {
        console.log('🔍 [STEP 3] After role check - req.user:', !!req.user);
        next();
    },
    
    // رفع الملفات (استخدام .any() لقبول ملفات ديناميكية من الخصائص)
    (req, res, next) => {
        console.log('🔍 [STEP 3.5] Before multer');
        realestateController.upload.any()(req, res, (err) => {
            if (err) {
                console.error('❌ Multer error:', err);
                return res.status(400).json({
                    error: err.message,
                    code: err.code
                });
            }
            console.log('🔍 [STEP 4] After multer - req.user:', !!req.user);
            console.log('🔍 [STEP 4] Files received:', req.files ? Object.keys(req.files) : 'NONE');
            next();
        });
    },

    // Controller
    realestateController.addRealEstate
);


// Other routes
router.delete('/:id', requireAuth, requirePropertyOwnership, realestateController.deleteRealEstate);
router.delete('/deleteFile/:name', requireAuth, requireRole(['admin', 'company']), realestateController.deleteFile);
router.post('/filter', realestateController.filter);
router.put('/:id', requireAuth, requirePropertyOwnership, realestateController.updateRealEstate);

module.exports = router;