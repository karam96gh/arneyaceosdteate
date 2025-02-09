const express = require('express');
const router = express.Router();
const citiesController = require('../controllers/citiesController');

router.get('/', citiesController.getAllCities);
router.get('/:id', citiesController.getCityById);
router.post('/', citiesController.addCity);
router.put('/:id', citiesController.updateCity);
router.delete('/:id', citiesController.deleteCity);

module.exports = router;
