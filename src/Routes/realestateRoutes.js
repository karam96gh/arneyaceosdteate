// src/routes/realestateRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const realestateController = require('../controllers/realestateController');
const { requireAuth, requireRole, requirePropertyOwnership } = require('../middleware/auth');
const { preserveUserAfterMulter } = require('../middleware/preserveUser');

// GET routes (no auth issues)
router.get('/', realestateController.getAllRealEstate);
router.get('/:id', realestateController.getRealEstateById);
router.get('/items/:id', realestateController.getRealEstateByBuildingItemId);
router.get('/similar/:id', realestateController.getRealEstateSimilar);
router.get('/my-properties', requireAuth, requireRole(['company']), realestateController.getMyProperties);

// ✅ POST route with FIXED middleware order
router.post('/', 
    // ✅ 1. أولاً: التحقق من المصادقة
    requireAuth,
    // ✅ 2. ثانياً: التحقق من الدور
    requireRole(['admin', 'company']),
    // ✅ 3. ثالثاً: رفع الملفات (multer middleware)
    realestateController.upload.fields([
        { name: 'coverImage', maxCount: 1 },
        { name: 'files', maxCount: 10 }
    ]),
    // ✅ 4. رابعاً: middleware لحفظ بيانات المستخدم بعد multer
    preserveUserAfterMulter,
    // ✅ 5. أخيراً: controller function
    realestateController.addRealEstate
);

// Other routes
router.delete('/:id', requireAuth, requirePropertyOwnership, realestateController.deleteRealEstate);
router.delete('/deleteFile/:name', requireAuth, requireRole(['admin', 'company']), realestateController.deleteFile);
router.post('/filter', realestateController.filter);
router.put('/:id', requireAuth, requirePropertyOwnership, realestateController.updateRealEstate);

module.exports = router;