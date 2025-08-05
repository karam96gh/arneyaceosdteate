const express = require('express');
const router = express.Router();
const realestateController = require('../controllers/realestateController');

// Test middleware import
console.log('=== TESTING MIDDLEWARE IMPORT ===');
try {
    const authMiddleware = require('../middleware/auth');
    console.log('Auth middleware imported successfully:', Object.keys(authMiddleware));
    const { requireAuth, requireRole, requirePropertyOwnership, checkAuthHeader } = authMiddleware;
    console.log('Individual middleware functions:', { requireAuth: !!requireAuth, requireRole: !!requireRole, checkAuthHeader: !!checkAuthHeader });
} catch (error) {
    console.error('Error importing auth middleware:', error);
}

router.get('/', realestateController.getAllRealEstate);
router.get('/:id', realestateController.getRealEstateById);
router.get('/items/:id', realestateController.getRealEstateByBuildingItemId);
router.get('/similar/:id', realestateController.getRealEstateSimilar);
router.get('/my-properties', requireAuth, requireRole(['company']), realestateController.getMyProperties);

router.post('/', 
    (req, res, next) => {
        console.log('=== ROUTE MIDDLEWARE EXECUTED ===');
        console.log('Request method:', req.method);
        console.log('Request URL:', req.url);
        console.log('Request path:', req.path);
        next();
    },
    (req, res, next) => {
        console.log('=== SECOND MIDDLEWARE EXECUTED ===');
        next();
    },
    realestateController.addRealEstate
);

router.delete('/:id', requireAuth, requirePropertyOwnership, realestateController.deleteRealEstate);
router.delete('/deleteFile/:name', requireAuth, requireRole(['admin', 'company']), realestateController.deleteFile);
router.post('/filter', realestateController.filter);
router.put('/:id', requireAuth, requirePropertyOwnership, realestateController.updateRealEstate);

module.exports = router;
