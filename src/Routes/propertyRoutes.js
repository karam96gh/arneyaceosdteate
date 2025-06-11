const express = require('express');
const router = express.Router();
const propertiesController = require('../controllers/propertiesController');

// GET /api/properties - Get all properties
router.get('/', propertiesController.getAllProperties);

// GET /api/properties/filters - Get filter properties
router.get('/filters', propertiesController.getFilterProperties);

// GET /api/properties/final-type/:finalTypeId - Get properties by final type
router.get('/final-type/:finalTypeId', propertiesController.getPropertiesByFinalType);

// GET /api/properties/groups/:finalTypeId - Get property groups for a final type
router.get('/groups/:finalTypeId', propertiesController.getPropertyGroups);

// GET /api/properties/:id - Get property by ID
router.get('/:id', propertiesController.getPropertyById);

// POST /api/properties - Create new property
router.post('/', propertiesController.createProperty);

// POST /api/properties/bulk - Bulk create properties
router.post('/bulk', propertiesController.bulkCreateProperties);

// PUT /api/properties/:id - Update property
router.put('/:id', propertiesController.updateProperty);

// DELETE /api/properties/:id - Delete property
router.delete('/:id', propertiesController.deleteProperty);

module.exports = router; 
