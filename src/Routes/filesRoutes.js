const express = require('express');
const router = express.Router();
const filesController = require('../controllers/filesController');

router.get('/', filesController.getAllFiles);
router.get('/realestate/:realestateId', filesController.getFilesByRealEstateId);
router.post('/', filesController.addFile);
router.delete('/:id', filesController.deleteFile);

module.exports = router;
