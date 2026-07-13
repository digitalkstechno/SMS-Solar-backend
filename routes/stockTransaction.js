const express = require("express");
const router = express.Router();
const stockTransactionController = require("../controller/stockTransaction");
const authMiddleware = require("../middleware/auth");

const { authorize } = require("../middleware/permissions");

router.post("/", authMiddleware, authorize("stock", "create"), stockTransactionController.createTransaction);
router.get("/export", authMiddleware, authorize("stock", "readAll"), stockTransactionController.exportStockInReport);
router.get("/", authMiddleware, authorize("stock", "readAll"), stockTransactionController.getAllTransactions);
router.patch("/:id", authMiddleware, authorize("stock", "update"), stockTransactionController.updateTransaction);
router.delete("/:id", authMiddleware, authorize("stock", "delete"), stockTransactionController.deleteTransaction);

module.exports = router;
