const express = require('express');
const { getAllMaintypes, getMaintypeById, addMaintype, updateMaintype, deleteMaintype,upload } = require('../controllers/mainTypeController');
const router = express.Router();

router.get('/', getAllMaintypes);
router.get('/:id', getMaintypeById);
router.post('/',upload.single('icon'), addMaintype);
router.put('/:id', upload.single('icon'), updateMaintype); // Update route with file upload
router.delete('/:id', deleteMaintype);

module.exports = router;
