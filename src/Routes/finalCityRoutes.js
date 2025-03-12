const express = require('express');
const router = express.Router();
const finalCityController = require('../controllers/finalCityController');

router.get('/', finalCityController.getAllFinalCity);
router.get('/:neighborhoodId', finalCityController.getFinalCityByneighborhoodId);
router.post('/', finalCityController.addFinalCity);
router.delete('/:id', finalCityController.deleteFinalCity);
router.put('/:id', finalCityController.updateFinalCity);

module.exports = router;
