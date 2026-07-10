var express = require("express");
var router = express.Router();
var cityController = require("../controller/city");
var authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");

router.post("/add", authMiddleware, authorize("city", "create"), cityController.createCity);
router.get("/all", authMiddleware, cityController.getAllCities);
router.get("/:id", authMiddleware, cityController.getCityById);
router.put("/update/:id", authMiddleware, authorize("city", "update"), cityController.updateCity);
router.delete("/delete/:id", authMiddleware, authorize("city", "delete"), cityController.deleteCity);

module.exports = router;
