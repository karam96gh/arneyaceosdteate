const express = require('express');
const router = express.Router();
const realestateController = require('../controllers/realestateController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', realestateController.getAllRealEstate);
router.get('/:id', realestateController.getRealEstateById);
router.get('/items/:id', realestateController.getRealEstateByBuildingItemId);
router.get('/similar/:id', realestateController.getRealEstateSimilar);
router.get('/my-properties', requireAuth, requireRole(['company']), realestateController.getMyProperties);

router.post('/', requireAuth, requireRole(['admin', 'company']), realestateController.upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'files', maxCount: 10 }
]), realestateController.addRealEstate);

router.delete('/:id', requireAuth, requirePropertyOwnership, realestateController.deleteRealEstate);
router.delete('/deleteFile/:name', requireAuth, requireRole(['admin', 'company']), realestateController.deleteFile);
router.post('/filter', realestateController.filter);
router.put('/:id', requireAuth, requirePropertyOwnership, realestateController.updateRealEstate);

module.exports = router;
