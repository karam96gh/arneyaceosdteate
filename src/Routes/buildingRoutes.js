const express = require('express');
const { getBuildings, getBuildingById, createBuilding, updateBuilding, deleteBuilding } = require('../controllers/buildingController');
const { getBuildingItems, createBuildingItem, updateBuildingItem, deleteBuildingItem } = require('../controllers/buildingItemController');

const router = express.Router();

// المسارات الخاصة بالمباني
router.get('/buildings', getBuildings);
router.get('/buildings/:id', getBuildingById);
router.post('/buildings', createBuilding);
router.put('/buildings/:id', updateBuilding);
router.delete('/buildings/:id', deleteBuilding);

// المسارات الخاصة بالعناصر داخل المباني
router.get('/buildings/:buildingId/items', getBuildingItems);
router.post('/building-items', createBuildingItem);
router.put('/building-items/:id', updateBuildingItem);
router.delete('/building-items/:id', deleteBuildingItem);

module.exports = router;
