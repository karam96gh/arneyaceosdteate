const express = require('express');
const router = express.Router();
const filePropertyController = require('../controllers/filePropertyController');

// POST /api/properties/files/:realEstateId/:propertyId/upload - رفع ملف لخاصية
router.post('/files/:realEstateId/:propertyId/upload', filePropertyController.uploadPropertyFile);

// GET /api/properties/files/:realEstateId/:propertyId - معلومات ملف الخاصية
router.get('/files/:realEstateId/:propertyId', filePropertyController.getPropertyFileInfo);

// PUT /api/properties/files/:realEstateId/:propertyId - تحديث ملف الخاصية
router.put('/files/:realEstateId/:propertyId', filePropertyController.updatePropertyFile);

// DELETE /api/properties/files/:realEstateId/:propertyId - حذف ملف الخاصية
router.delete('/files/:realEstateId/:propertyId', filePropertyController.deletePropertyFile);

// GET /api/properties/files/:realEstateId - جميع ملفات الخصائص للعقار
router.get('/files/:realEstateId', filePropertyController.getRealEstatePropertyFiles);

module.exports = router;