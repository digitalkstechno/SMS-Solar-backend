const express = require("express");
const router = express.Router();
const categoryController = require("../controller/category");

const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, categoryController.createCategory);
router.get("/", authMiddleware, categoryController.getAllCategories);
router.get("/:id", authMiddleware, categoryController.getCategoryById);
router.patch("/:id", authMiddleware, categoryController.updateCategory);
router.delete("/:id", authMiddleware, categoryController.deleteCategory);

module.exports = router;
