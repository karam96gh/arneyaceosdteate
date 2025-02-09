const express = require('express');
const router = express.Router();
const neighborhoodsController = require('../controllers/neighborhoodsController');

router.get('/', neighborhoodsController.getAllNeighborhoods);
router.get('/:cityId', neighborhoodsController.getNeighborhoodsByCityId);
router.post('/', neighborhoodsController.addNeighborhood);
router.delete('/:id', neighborhoodsController.deleteNeighborhood);
router.put('/:id', neighborhoodsController.updateNeighborhood);

module.exports = router;
