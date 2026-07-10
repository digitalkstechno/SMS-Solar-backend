var express = require("express");
var router = express.Router();
var cityController = require("../controller/city");
var authMiddleware = require("../middleware/auth");

router.post("/add", authMiddleware, cityController.createCity);
router.get("/all", authMiddleware, cityController.getAllCities);
router.get("/:id", authMiddleware, cityController.getCityById);
router.put("/update/:id", authMiddleware, cityController.updateCity);
router.delete("/delete/:id", authMiddleware, cityController.deleteCity);

module.exports = router;
