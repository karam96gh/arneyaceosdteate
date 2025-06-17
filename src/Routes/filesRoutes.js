const express = require('express');
const router = express.Router();
const filesController = require('../controllers/filesController');

// ✅ المسارات الأساسية الموجودة
router.get('/', filesController.getAllFiles);
router.get('/realestate/:realestateId', filesController.getFilesByRealEstateId);
router.post('/', filesController.addFile);
router.delete('/:id', filesController.deleteFile);

// ✅ المسارات الجديدة المُضافة
// الحصول على ملف محدد بالمعرف
router.get('/:id', filesController.getFileById);

// إحصائيات الملفات
router.get('/stats/overview', filesController.getFilesStats);

// البحث في الملفات
router.get('/search/query', filesController.searchFiles);

module.exports = router;