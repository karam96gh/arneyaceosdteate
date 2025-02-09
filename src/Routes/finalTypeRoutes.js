// finalTypeRoutes.js

const express = require("express");
const router = express.Router();
const finalTypeController = require("../controllers/finalTypeController");

// CREATE: Add a new finalType
router.post("/", finalTypeController.createFinalType);

// READ: Get all finalTypes
router.get("/", finalTypeController.getAllFinalTypes);

// READ: Get a single finalType by ID
router.get("/:subId", finalTypeController.getFinalTypeBySubId);

// UPDATE: Update a finalType by ID
router.put("/:id", finalTypeController.updateFinalType);

// DELETE: Delete a finalType by ID
router.delete("/:id", finalTypeController.deleteFinalType);

module.exports = router;
