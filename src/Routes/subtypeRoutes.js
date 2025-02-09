const express = require('express');
const router = express.Router();
const subtypeController = require('../controllers/subtypeController');

router.get('/', subtypeController.getAllSubtypes);
router.get('/:mainId', subtypeController.getSubtypesByMainId);
router.post('/', subtypeController.addSubtype);
router.delete('/:id', subtypeController.deleteSubtype);
router.put('/:id', subtypeController.updateSubtype);

module.exports = router;
