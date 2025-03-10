const express = require('express');
const router = express.Router();
const realestateController = require('../controllers/realestateController');

router.get('/', realestateController.getAllRealEstate);
router.get('/:id', realestateController.getRealEstateById);
router.get('/items/:id', realestateController.getRealEstateByBuildingItemId);
router.get('/similar/:id', realestateController.getRealEstateSimilar);

router.post('/',realestateController.upload.fields([
    { name: 'coverImage', maxCount: 1 }, // الغلاف
    { name: 'files', maxCount: 10 } // ملفات إضافية (اختياري)
]), realestateController.addRealEstate);

router.delete('/:id', realestateController.deleteRealEstate);
router.put('/:id',realestateController.upload.fields([
    { name: 'coverImage', maxCount: 1 }, // الغلاف
    { name: 'files', maxCount: 10 } // ملفات إضافية (اختياري)
]), realestateController.updateRealEstate);
module.exports = router;
