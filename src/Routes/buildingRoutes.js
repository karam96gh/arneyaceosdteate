const express = require('express');
const { getBuildings, getBuildingById, createBuilding, updateBuilding,getMyBuildings, deleteBuilding } = require('../controllers/buildingController');
const { getBuildingItems, createBuildingItem, updateBuildingItem, deleteBuildingItem } = require('../controllers/buildingItemController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// المسارات الخاصة بالمباني
router.get('/buildings', requireAuth, getBuildings); // ✅ إضافة auth
router.get('/buildings/:id', getBuildingById);
router.post('/buildings', createBuilding);
router.put('/buildings/:id', updateBuilding);
router.delete('/buildings/:id', deleteBuilding);
router.get('/my-buildings', requireAuth, requireRole(['company']), getMyBuildings);

// المسارات الخاصة بالعناصر داخل المباني
router.get('/buildings/:buildingId/items', requireAuth, getBuildingItems); // ✅ إضافة auth
router.post('/building-items', requireAuth, requireRole(['admin', 'company']), createBuildingItem); // ✅ إضافة auth
router.put('/building-items/:id', requireAuth, requireBuildingItemOwnership, updateBuildingItem); // ✅ إضافة auth
router.delete('/building-items/:id', requireAuth, requireBuildingItemOwnership, deleteBuildingItem); // ✅ إضافة auth

module.exports = router;
